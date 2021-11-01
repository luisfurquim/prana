const txt = 0;
const ref = 1;
const str = 2;
const dot = 3;
const open = 4;
const close = 5;
const num = 6;
const ident = 7;
const wsep = 8;
const expr = 9;
const attr = 10;
const needle = [ "{", "}" ];
var sep = '.';

function textParse(s) {
   var i=0, start=0;
   var res = [];
   var stat = txt;

   while(i < s.length) {
      if (s[i] == needle[stat]) {
         if (((i+1)<s.length && (s[i+1] == needle[stat]))) {
            if (stat==txt) {
               if (i > start) {
                  res.push({
                     type: txt,
                     val: s.substring(start,i)
                  });
               }
            } else {
               res.push({
                  type: ref,
                  val: s.substring(start,i)
               });
            }
            i++;
            start = i + 1;
            stat ^= 1;
         }
      }
      i++;
   }

   if (start < s.length) {
      res.push({
         type: txt,
         val: s.substring(start,i)
      });
   }

   return res;
}

function tokenize(s) {
   var i, j;
   var tokens = [];
   var pretokens = parseString(s);
   var tks, typ;

   for(i=0; i<pretokens.length; i++) {
      if (pretokens[i].type==str) {
         tokens.push(pretokens[i]);
         continue;
      }


      tks = pretokens[i].val.split(/([.\[\]])|([+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+))|([a-zA-Z_\$][0-9a-zA-Z_\$]*)/g);
      for(j=0; j<tks.length; j++) {
         if (tks[j]) {
            if (tks[j] == ".") {
               typ = dot;
            } else if (tks[j] == "[") {
               typ = open;
            } else if (tks[j] == "]") {
               typ = close;
            } else if (tks[j][0].match(/^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/)) {
               typ = num;
               tks[j] = parseInt(tks[j]);
            } else  if (tks[j][0].match(/[a-zA-Z_\$][0-9a-zA-Z_\$]*/)) {
               typ = ident;
            } else {
               continue;
            }

            tokens.push({
               type: typ,
               val: tks[j]
            });
         }
      }

   }

   return tokens;
}


function parseString(s) {
   var i, start;
   var stat=txt;
   var delim;
   var res=[];

   for(i=0,start=0;i<s.length;i++) {
      if (stat==txt) {
         if ((s[i]=="'") || (s[i]=='"')) {
            stat = str;
            delim = s[i];
            if (i>start) {
               res.push({
                  type: txt,
                  val: s.substring(start,i)
               });
            }
            start = i + 1;
         }
      } else if (s[i]==delim) {
         stat = txt;
         res.push({
            type: str,
            val: s.substring(start,i)
         });
         start = i + 1;
      }
   }

   if (start < s.length) {
      res.push({
         type: txt,
         val: s.substring(start,i)
      });
   }

   return res;
}


function parseReference(tokens) {
   var token;
   var tree = [];
   var stat = wsep;

   if (tokens.length==0) {
      throw "empty reference";
   }

   token = tokens.splice(0,1)[0];
   if ((token.type == num) || (token.type == str)) {
      if (tokens.length==0 || tokens[0].type==close) {
         tokens.splice(0,1);
         return [token];
      }
   }

   if (token.type != ident) {
      throw "syntax error";
   }

   tree.push(token);

   while(tokens.length>0 && tokens[0].type!=close) {
      token = tokens.splice(0,1)[0];

      if (stat==wsep) {
         if (token.type == open) {
            tree.push({
               typ: expr,
               val: parseReference(tokens)
            });
            continue;
         } else if (token.type != dot) {
            throw "syntax error";
         }

         stat = ref;

      } else {
         if ((token.type == ident) || (token.type == str)) {
            tree.push(token);
            stat = wsep;
            continue;
         }
         throw "syntax error";
      }
   }

   if (tokens.length>0 && tokens[0].type==close) {
      tokens.splice(0,1);
   }

   return tree;
}

function solve(tree, ctx) {
   var i;
   var sym, tmp;

   sym = ctx;

   for(i=0; i<tree.length; i++) {
      if ((tree[i].type == str) || (tree[i].type == num) || (tree[i].type == txt)) {
         sym = tree[i].val;
      } else if (tree[i].type == ident) {
         sym = sym[tree[i].val];
      } else {
         sym = sym[solve(tree[i].val, ctx)];
      }
   }

   return sym;
}

function isPureReference(tree) {
   var i;

   for(i=0; i<tree.length; i++) {
      if ((tree[i].type == str) || (tree[i].type == num) || (tree[i].type == txt)) {
         return false;
      }
   }

   return true;
}

function refOf(tree, ctx) {
   var i, j;
   var sym, tmp, next;

   sym = ctx;

   for(i=0; i<tree.length; i++) {
      if (next !== undefined) {
         sym = sym[next];
      }
      if (tree[i].type == ident) {
         next = tree[i].val;
      } else {
         j = -1;
         do {
            j++;
            [tmp, next] = refOf(tree[i], [ctx[j]]);
            if (tmp !== undefined) {
               tmp = tmp[0];
            }
         } while ((j<ctx.length) && ((next === undefined) || (tmp[next]===undefined)));
         if ((j>=ctx.length) || (ctx[j][next]===undefined)) {
            return [undefined, undefined];
         }
         sym = ctx[j];
      }
   }

   return [sym, next];
}

function getReferences(model) {
   var i, j;
   var tree={}, arrays=[];
   var refs, tmpref, found, hasRef, arrayVar, cond, sub;
   var plug, parent;

   found = false;

   if (model.nodeName == "#text") {
      refs = textParse(model.data);
      tree.type = txt;
      tree.ref = [];

      for(i=0; i<refs.length; i++) {
         if (refs[i].type == ref) {
            found = true;
            tree.ref.push(parseReference(tokenize(refs[i].val)));
         } else {
            tree.ref.push([refs[i]]);
         }
      }

      if (found) {
         return tree;
      }
      return undefined;
   }

   if (model.nodeType!=1) {
      return undefined;
   }

   tree.type = attr;
   tree.refs = {};
   tree.children = {};

   for(i=0; i<model.attributes.length; i++) {
      if (model.attributes[i].name.substr(0,1) == "*") {
         arrayVar = model.attributes[i].name.substr(1);
         found = true;
         continue;
      }

      if (model.attributes[i].name.substr(0,1) == "?") {
         cond = model.attributes[i].name.substr(1);
         found = true;
         continue;
      }

      refs = textParse(model.attributes[i].value);
      tmpref = [];
      hasRef = false;

      for(j=0; j<refs.length; j++) {
         if (refs[j].type == ref) {
            found = true;
            hasRef = true;
            tmpref.push(parseReference(tokenize(refs[j].val)));
         } else {
            tmpref.push([refs[j]]);
         }
      }
      if (hasRef) {
         tree.refs[model.attributes[i].name] = tmpref;
         if (isPureReference(tmpref)) {
            model.attributes[i].pranaRef = tmpref;
         }
      }
   }

   if (cond !== undefined) {
      tree.cond = cond;
      model.removeAttribute("?" + cond);
      model.tree = parseReference(tokenize(cond));
   }

   if (arrayVar !== undefined) {
      tree.arrayVar = arrayVar;
      model.removeAttribute("*" + arrayVar);
      plug = document.createElement("SPAN");
      plug.setAttribute("style", "margin: 0px; padding: 0px;");
      plug.model = model;
      [ plug.aCtrl, plug.aIndex ] = arrayVar.split(":");
      plug.tree = parseReference(tokenize(plug.aCtrl));
      parent = model.parentNode;
      parent.replaceChild(plug, model);
   }

   for(i=0; i<model.childNodes.length; i++) {
      sub = getReferences(model.childNodes[i]);
      if (sub !== undefined) {
         found = true;
         tree.children[i] = sub;
      }
   }

   if (found) {
      return tree;
   }
   return undefined;
}

function solveAll(ref, ctx) {
   var i, j, out, tmp;

   out = "";
   for(i=0; i<ref.length; i++) {
      j = 0;
      do {
         tmp = solve(ref[i], ctx[j]);
         j++;
      } while ((tmp === undefined) && (j<ctx.length));
      if (tmp !== undefined) {
         out += tmp;
      }
   }

   return out;
}

function syncElement(dom, ref, ctx, syncDown) {
   var k, val, attr;

   for(k in ref.refs) {
      if (ref.refs.hasOwnProperty(k)) {
         val = solveAll(ref.refs[k], ctx);
         dom.setAttribute(k, val);
         attr = dom.getAttributeNode(k);
         if (attr.pranaRef !== undefined) {
            attr.pranaCtx = ctx;
         }

/*
         if (syncDown && (dom.prana!==undefined) && (dom.prana.this.hasOwnProperty(k))) {
            if ((typeof syncDown === "boolean") || (dom.prana.dom !== syncDown)) {
               dom.prana.this[k] = val;
               dom.prana.syncLocal(syncDown);
            }
         }
*/

      }
   }

   for(k in ref.children) {
      sync(dom.childNodes[k], ref.children[k], ctx, syncDown);
   }
}

function stack(index, subctx, mainctx) {
   var i;
   var stk = [index];

   for(i=0; i<subctx.length; i++) {
      stk.push(subctx[i]);
   }

   for(i=0; i<mainctx.length; i++) {
      stk.push(mainctx[i]);
   }

   return stk;
}

function cloneNode(model) {
   var i, node;

   node = model.cloneNode(true);
   for(i=0; i<model.attributes.length; i++) {
      if (model.attributes[i].pranaRef !== undefined) {
         node.attributes[i].pranaRef = model.attributes[i].pranaRef;
      }
   }

   return node;
}

function condSync(dom, ref, ctx, index, syncDown) {
   var i, res;
   var newNode;
   var tree;
   var model;

   if (dom.nodeType == Node.COMMENT_NODE) {
      tree = dom.model.tree;
   } else {
      tree = dom.tree;
   }

   i = 0;
   do {
      res = solve(tree, ctx[i]);
      i++;
   } while ((res === undefined) && (i<ctx.length));


   if (typeof res == "function") {
      res = res(index);
   }

   if (res) {
      if (dom.nodeType == Node.COMMENT_NODE) {
         model = dom.model;
         dom.parentNode.replaceChild(dom.model, dom);
         dom = model;
      }
      syncElement(dom, ref, ctx, syncDown);
   } else {
      if (dom.nodeType == Node.ELEMENT_NODE) {
         newNode = document.createComment("if false");
         newNode.model = dom;
         dom.parentNode.replaceChild(newNode, dom);
      }
   }
}

function sync(dom, ref, ctx, syncDown) {
   var i;
   var arr, res;
   var ndx;
   var plug;

   if (ref.type == txt) {
      dom.data = solveAll(ref.ref, ctx);
   } else {
      if (ref.arrayVar) {
         console.log(ref);
         i = 0;
         do {
            arr = solve(dom.tree, ctx[i]);
            i++;
         } while ((arr === undefined) && (i<ctx.length));

         if (arr === undefined) {
            throw "Unresolved symbol " + dom.aCtrl + " during array syncing";
         }

         for(i=0; (i<arr.length) && (i<dom.childNodes.length); i++) {
            ndx = {};
            ndx[dom.aIndex] = i;
            if (ref.cond) {
               condSync(dom.childNodes[i], ref, stack(ndx, [arr[i]], ctx), i, syncDown);
            } else {
               syncElement(dom.childNodes[i], ref, stack(ndx, [arr[i]], ctx), syncDown);
            }
         }
         for(; i<arr.length; i++) {
            ndx = {};
            ndx[dom.aIndex] = i;
            dom.appendChild(cloneNode(dom.model));
            if (ref.cond) {
               dom.childNodes[i].tree = dom.model.tree;
               condSync(dom.childNodes[i], ref, stack(ndx, [arr[i]], ctx), i, syncDown);
            } else {
               syncElement(dom.childNodes[i], ref, stack(ndx, [arr[i]], ctx), syncDown);
            }
         }
         while(i<dom.childNodes.length) {
            dom.removeChild(dom.childNodes[i]);
         }
      } else if (ref.cond) {
         condSync(dom, ref, ctx, undefined, syncDown);
      } else {
         syncElement(dom, ref, ctx, syncDown);
      }
   }
}

function bind(data, dom, model) {
   var prx;
   var parent = dom.parentNode.host;

   if (data.__isProxy) {
      return data;
   }

   do {
      parent = parent.parentNode;
   } while ((parent !== undefined) && (parent !== null) && (parent !== document) && (parent.prana === undefined));

   dom.prana = {
      this: data,
      refs: getReferences(model),
      syncLocal: function(syncDown) {
         sync(model, dom.prana.refs, [dom.prana.this], syncDown);
      },

      syncUp: function(childSource) {
         var i, sym, key, changed = false;
         var host = dom.parentNode.host;

         for(i=0; i<host.attributes.length; i++) {
            if (
               (dom.prana.this.hasOwnProperty(host.attributes[i].name)) &&
               (host.attributes[i].pranaRef!==undefined) &&
               (host.attributes[i].pranaCtx!==undefined)
            ) {
               [sym, key] = refOf(host.attributes[i].pranaRef, host.attributes[i].pranaCtx);
               if ((sym !== undefined) && (key !== undefined) && (sym[key] != dom.prana.this[host.attributes[i].name])) {
                  changed = true;
                  sym[key] = dom.prana.this[host.attributes[i].name];
               }
            }
         }

         if ((changed) && (dom.prana.parent!==undefined)) {
            dom.prana.parent.prana.syncLocal(childSource);
            dom.prana.parent.prana.syncUp(dom);
         }
      },

      sync: function() {
         dom.prana.syncLocal(true);
         dom.prana.syncUp(dom);
      }
   };

   if ((parent !== undefined) && (parent !== null) && (parent !== document) && (parent.prana !== undefined)) {
      dom.prana.parent = parent.parentNode.host.root;
//      dom.prana.parent = parent.parentNode;
   }


   try {
      dom.prana.sync();
   } catch(e) {
      // We sync before appending to DOM because there are situations where the template variable
      // references may cause error (like M{{dist}} inside an SVG element).
      //
      // But there may be user defined 'if' conditions that test its validity against values referenced
      // by the proxy variable that will be returned by this bind function (and because it was not
      // returned yet we are facing a chicken/egg problem).
      //
      // So, we sync anyway but intercept any error thrown along the way.
      //
      // But, after appending to the DOM, we sync again, because if some error was thrown with the first sync
      // the interception just prevented Prana from being stopped, but we may still have unsynced parts
      // in the DOM, so the second sync, delayed by the timeout, will be called AFTER the bind has returned
      // and the variable which references the proxy will then be initialized and any user defined 'if' condition
      // will run with no problems (okay no problems caused by this chicken/egg issue, if the user code has bugs
      // then these bugs will cause their failures anyway and it will be the user's responsibility to detect and fix)
   };
   dom.appendChild(model);
   setTimeout(function() {
      var i, sym, key, changed = false;

      for(i=0; i<dom.parentNode.host.attributes.length; i++) {
         dom.prana.this[dom.parentNode.host.attributes[i].name] = dom.parentNode.host.attributes[i].value;
      }

      dom.prana.syncLocal(true);
   },10);

   prx = {
      apply: function(target, thisArg, argumentsList) {
         console.log("apply", target, thisArg, argumentsList, this);
         return thisArg[target].apply(this, argumentList);
      },
      get: (target, key) => {
         if (key === "__isProxy") {
            return true;
         }

         if ((target.hasOwnProperty(key)) && (typeof target[key] === "object") && (target[key] !== null)) {
            return new Proxy(target[key], prx);
         }

         return target[key];
      },
      deleteProperty: function(target, property) {
         console.log("del", target, property);
         console.log("prx", prx);
         console.log("data", data);
         return true;
      },
      set: function(target, property, value, receiver) {
         console.log("set arg", arguments);

         target[property] = value;
         dom.prana.sync();

         return true;
      }
   };

   return new Proxy(data, prx);
}



var prana = {
   propagate: {},
   def: function(opts) {
      var defs, files, modkeys, modname;

      modkeys = Object.keys(opts.modules);
      defs = new Array(modkeys.length);

      for(let i=0; i<modkeys.length; i++) {
         files = [];
         if ((typeof modkeys[i] !== "string") || (typeof opts.modules[modkeys[i]] !== "string")) {
            throw "Needs tag and js definitions";
         }

         defs[i] = {};
         modname = opts.modules[modkeys[i]].split("/");
         modname = modname[modname.length-1];

         files.push(
            import(opts.dir + opts.modules[modkeys[i]] + "/" + modname + ".js")
            .then(function(mod) {
               return new Promise(function(resolve, reject) {
                  defs[i].js = mod.default;
                  defs[i].attr = mod.attr;
                  resolve();
               });
            })
         );

         files.push(
            fetch(new Request(opts.dir + opts.modules[modkeys[i]] + "/" + modname + ".html"))
            .then(function(resp) {
               return new Promise(function(resolve, reject) {
                  if (!resp.ok) {
                     reject();
                  } else {
                     resp
                     .text()
                     .then(function(txt) {
                        defs[i].html = document.createElement('template');
                        defs[i].html.innerHTML = txt;
                        resolve();
                     });
                  }
               })
            })
         );

         files.push(
            fetch(new Request(opts.dir + opts.modules[modkeys[i]] + "/" + modname + ".css"))
            .then(function(resp) {
               return new Promise(function(resolve, reject) {
                  if (!resp.ok) {
                     reject();
                  } else {
                     resp
                     .text()
                     .then(function(txt) {
                        var sc;
                        defs[i].css = document.createElement('style');
                        defs[i].css.innerText = txt;
                        resolve();
                     });
                  }
               })
            })
         );


//console.log("files", files);

         Promise
         .all(files)
         .then(function() {

            //

            customElements.define(
               modkeys[i],
               class extends HTMLElement {
                  static get observedAttributes() {
                     if (defs[i].attr !== undefined) {
                        return defs[i].attr;
                     }
                     return [];
                  }

                  constructor() {
                     var self;
                     var initElement;

                     super();
                     self = this;
                     this.root = {};

                     initElement = function(data) {
                        return function() {
                           var dataProxy;
                           var j;
                           var att;
                           var html;
                           var css;
                           var ready;
                           var prom;

                           html = defs[i].html.content.cloneNode(true).children[0];
                           if (defs[i].css !== undefined) {
                              css = defs[i].css.cloneNode(true);
                           }

                           for(j=0; j<self.attributes.length; j++) {
                              att = self.attributes[j];
                              data[att.name] = att.value;
                           }

                           // Attach a shadow root to the element.
                           let shadowRoot = self.attachShadow({mode: "open"});
                           if (css !== undefined) {
                              shadowRoot.appendChild(css);
                           }
                           self.root = document.createElement("SPAN");
                           shadowRoot.appendChild(self.root);
                           self.root.appendChild(html);

                           ready = function(resolve, reject) {
                              if (dataProxy !== undefined) {
                                 setTimeout(
                                    function () {
                                       resolve({
                                          this: dataProxy,
                                          dom: self.root
                                       });
                                    },
                                    500
                                 );
                              } else {
                                 setTimeout(
                                    function () {
                                       ready(resolve, reject);
                                    },
                                    10
                                 );
                              }
                           };

                           prom = new Promise(ready);
                           data = defs[i].js.call(data, prom);
                           dataProxy = bind(data,self.root,html);
                           console.log("root", self.root);
                        };
                     }({});

                     initElement();
                  }

                  attributeChangedCallback(name, oldValue, newValue) {
                     this.root.prana.this[name] = newValue;
                     if (oldValue != newValue) {
                        this.root.prana.sync();
                     }
                  }
               }
            );
         });
      }
   }

};


export default prana;
