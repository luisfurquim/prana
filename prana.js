var done = [];


function toggleTrue(el) {
   if (el.dataset.not === undefined) {
      return;
   }

   $(el).css("display", el.dataset.not);
   delete el.dataset.not;
}

function toggleFalse(el) {
   if (el.dataset.not === undefined) {
      el.dataset.not = $(el).css("display");
      $(el).css("display", "none");
   }
}


function triggerUpdate() {
   var i;

   for(i=0; i<done.length; i++) {
      done[i].dom.dispatchEvent(new CustomEvent("update", {
         detail: done[i].prop
      }));
   }

   done = [];
}

function visited(dom, prop) {
   var i;
   var ret;

   if (prop == "destroyDOM") {
      return undefined;
   }

   for(i=0; i<done.length; i++) {
      if (dom==done[i].dom) {
         ret = {
            dom: i,
            prop: false
         };

         if (done[i].prop.includes(prop)) {
            ret.prop = true;
         }

         return ret;
      }
   }

   return undefined;
}


function merge(a, b) {
   var varname, i, j;

   for(varname in b) {
      if (b.hasOwnProperty(varname)) {
         if (a.hasOwnProperty(varname)) {
            for(i=0; i<b[varname].length; i++) {
               for(j=0; j<a[varname].length; j++) {
                  if (b[varname][i].dom == a[varname][j].dom) {
                     if (
                        (
                           (b[varname][i].txt) &&
                           (b[varname][i].txt == a[varname][j].txt)
                        ) ||
                        (
                           (b[varname][i].att) &&
                           (b[varname][i].att == a[varname][j].att)
                        ) ||
                        (
                           (b[varname][i].cond) &&
                           (b[varname][i].cond == a[varname][j].cond)
                        )
                     ) {
                        break;
                     }
                  }
               }
               if (j == a[varname].length) {
                  a[varname].push(b[varname][i]);
               }
            }
         } else {
            a[varname] = b[varname];
         }
      }
   }
}

function applyer(vars, tpl) {
   var splitted = tpl.split(reSplitNameRef);

   return function(newVars) {
      var res = "";
      var i;
      var m;
      var v;

      for(v in newVars) {
         if (vars.hasOwnProperty(v)) {
            vars[v] = newVars[v];
         }
      }

      for(i=0; i<splitted.length; i++) {
         m = [...splitted[i].matchAll(reNameRef)];
         if (m && m.length>0) {
            if (typeof vars[m[0][1]] === "function") {
               res += vars[m[0][1]]();
            } else {
               res += vars[m[0][1]];
            }
         } else {
            res += splitted[i];
         }
      }

      return res;
   };
}

var reNameRef = /{{([a-zA-Z_$][a-zA-Z_$0-9]*)}}/g;
var reSplitNameRef = /({{[a-zA-Z_$][a-zA-Z_$0-9]*}})/g;

function template(data, model, syncDOM) {
   var v, att, i, j, b, binds = [];
   var obs=[];
   var ret;

   model = $(model);

   var bound = {};

   model.each(function() {
      var el, att, r, ref, vars, b, i, attVal, txtVal;
      var bck, $this, name;
      var maySyncBack;
      var splitted;
      var tmp;
      var attName;
      var pranaId;
      var keys;

      $this = $(this);

//      console.log("this", this.attributes);

      if (this.attributes !== undefined) {
         for(att=0; att<this.attributes.length; att++) {
            name = this.attributes[att].name;
            if (name.length>1) {
               if (name[0]=="*") {
                  $this.removeAttr(name);
                  name       = name.substring(1);
   //               console.log("data", data);
                  data[name] = bind_array(data[name], $this, name);
                  return;
               } else if (name[0]=="?") {
                  $this.removeAttr(name);
                  name       = name.substring(1);
   //               console.log("data", data);
//                  data[name] = bind_if(data, name, $this, $this);
                  merge(bound, {
                     [name]: [{
                        dom: $this,
                        cond: bind_if(data, name, $this, $this)
                     }]
                  });
//                  return;
               }
            }
         }
      }

//      for(el=this.firstChild, i=0; el!==null; el=el.nextSibling, i++) {
      for(i=0; i<this.childNodes.length; i++) {
         el = this.childNodes[i];
         if (el.nodeType==1) {
            tmp = template(data, $(el), syncDOM);
            merge(bound, tmp);
         } else if (el.nodeName == "#text") {
            ref = el.data.matchAll(reNameRef);
            b = [];
            vars = {};
            for(r of ref) {
               if (data.hasOwnProperty(r[1])) {
                  vars[r[1]] = data[r[1]];

                  merge(bound, {
                     [r[1]]: [{
                        dom: $this,
                        txt: i
                     }]
                  });
               }
            }

            if (Object.keys(vars).length > 0) {
               splitted = el.data.split(reSplitNameRef);

               $this.data(
                  "tbound_" + i,
                  applyer(vars, el.data)
               );

               pranaId = (""+performance.now()).replace(".","_");
               $this.data("pranaId", pranaId);

               if (
                  (splitted.length==3) &&
                  (splitted[0]=="") &&
                  (splitted[2]=="")
               ) {
                  $this.on("input", function(prop, el) {
                     return function (ev) {
   //                     console.log("Got value", el.value, "prop", prop);
                        data[prop] = el.value;
   //                     console.log("set value", data[prop]);
                        return true;
                     }
                  }(r[1], this));
               }
            }
         }
      }

      if (this.attributes !== undefined) {
         for(att=0; att<this.attributes.length; att++) {
            if (this.attributes[att].name.startsWith("data-")) {
               continue;
            }

            attName = this.attributes[att].name;

            ref = this.attributes[att].nodeValue.matchAll(reNameRef);
            b = [];
            vars = {};
            for(r of ref) {
               if (data.hasOwnProperty(r[1])) {
//                  console.log("binding", r);
                  vars[r[1]] = data[r[1]];
                  merge(bound, {
                     [r[1]]: [{
                        dom: $this,
                        att: attName
                     }]
                  });
               }
            }

            keys = Object.keys(vars);
            if (keys.length > 0) {
               splitted = this.attributes[att].nodeValue.split(reSplitNameRef);
//               console.log("this.attributes[att].nodeValue", this.attributes[att].nodeValue);

               for(i=0; i<keys.length; i++) {
                  $this.data(
                     "bound_" + keys[i],
                     applyer(vars, this.attributes[att].nodeValue)
                  );
               }

               pranaId = (""+performance.now()).replace(".","_");
               $this.data("pranaId", pranaId);

               if (
                  (splitted.length==3) &&
                  (splitted[0]=="") &&
                  (splitted[2]=="")
               ) {

                  if (attName=="value") {
                     $this.change(function(prop) {
                        $this[0].value = data[prop];
                        return function (ev) {
                           var vis;

                           data[prop] = ev.target.value;

                           vis = visited(ev.target, prop);
                           if (vis !== undefined) {
                              if (vis.prop) {
                                 return;
                              }
                              done[vis.dom].prop.push(prop);
                           } else {
                              done.push({
                                 dom: ev.target,
                                 prop:[prop]
                              });
                           }

                        }
                     }(r[1]));
                  } else if (attName=="checked") {
                     this.checked = data[r[1]];
                     $this.change(function(prop) {
                        return function (ev) {
   //                        console.log("Got value", ev.target.checked);
                           data[prop] = ev.target.checked;
                        }
                     }(r[1]));
                  } else {
                     obs.push(new MutationObserver(function(dom, prop) {
                        return function(elems) {
                           var vis;
                           var val = $(elems[0].target).attr(elems[0].attributeName);

                           data[prop] = val;

                           vis = visited(dom, prop);
                           if (vis !== undefined) {
                              if (vis.prop) {
                                 return;
                              }
                              done[vis.dom].prop.push(prop);
                           } else {
                              done.push({
                                 dom: dom,
                                 prop:[prop]
                              });
                           }
                           syncDOM(prop, val);

                           if (prana.propagate[dom.localName] !== undefined) {
                              prana.propagate[dom.localName](dom, prop, val);
                           }

                        };
                     }(this, r[1])));
   //                  console.log("binds[b].atts[0].val", binds[b].atts[0].val);
                     obs[obs.length-1].observe(this, {
                        attributes: true,
                        attributeFilter: [r[1]]
                     });

                     $this.data("bindobs", obs);
                  }

               }
            }
         }
      }

   });

   return bound;
}

function bind_array(data, dom, propName) {
   var i;
   var bck;
   var model;
   var find_row, set_row;
   var ret;

   find_row = function(n) {
      var i, row;

      for(
         i=0, row=dom[0];
         i<=n && row.nextSibling!=null && row.nextSibling.nodeType!=8;
         i++, row=row.nextSibling
      ) {}

      return [i, row];
   }

   set_row = function(tgt, n, val) {
      var i, row, rowmodel;

      [i, row] = find_row(n);
      row = $(row);

      if (i<=n) {
         for(; i<=n; i++, row = row.next()) {
            rowmodel = $(model).clone(false, false);
            row.after(rowmodel);
            tgt[n] = bind(val, row, rowmodel, n);
         }
      } else {
//         rowmodel = $(model).clone(false, false);
         for(k in val) {
            if (val.hasOwnProperty(k)) {
               tgt[n][k] = val[k];
            }
         }
      }

//      tgt[n] = bind(val, row, rowmodel, n);
      if (tgt[n].__isProxy) {
         tgt[n].sync();
      }

//      tgt[n] = val;
/*
      if (typeof val === 'object' && val !== null) {
         if (tgt[n] === undefined) {
            tgt[n] = {};
         } else {
            for(i in tgt[n]) {
               if (tgt[n].hasOwnProperty(i)) {
                  delete tgt[n][i];
               }
            }
         }
         for(i in val) {
            if (val.hasOwnProperty(i)) {
               tgt[n][i] = val[i];
            }
         }
      } else {
         tgt[n] = val;
      }
*/

      return row;
   }

   if ((data===undefined) || !Array.isArray(data)) {
      data = [];
   }

   bck = document.createComment("*" + propName);
   model = dom.replaceWith(bck);
   dom = $(bck);
   dom.after(document.createComment("*" + propName));
   for(i=0; i<data.length; i++) {
      set_row(data, i, data[i]);
   }

   ret = new Proxy(data, {
      apply: function(target, thisArg, argumentsList) {
         console.log("apply", target, thisArg, argumentsList, this, argumentList);
         return thisArg[target].apply(this, argumentList);
      },

      deleteProperty: function(target, property) {
         var i, prop;

         prop = parseInt(property, 10);
         console.log("del", target, prop);
         target.splice(prop, 1);
         find_row(prop)[1].remove();
         return true;
      },

      set: function(target, property, value, receiver) {
         var i;
         var prop;

         if (property=="length") {
            if (value<target.length) {
               for(i=value; i<target.length; i++) {
                  target.splice(i, 1);
                  find_row(i)[1].remove();
               }
            }
            target.length = value;
            return true;
         }

         prop = parseInt(property, 10);

         set_row(target, prop, value);

         //syncDOM(property, value);

         setTimeout(triggerUpdate,500);

         return true;
      }
   });

   data.remove = function(n, size) {
      size = parseInt(size,10);
      if (Number.isNaN(size)) {
         size = 1;
      }

      for(;size>0; size--, n++) {
         data[n].destroyDOM();
         data.splice(n,1);
      }
   };

   return ret;
}



function bind_if(data, cond, dom, model, index, up, initialdata) {
   var syncDOM;
   var prop;
   var el;
   var refresher;

   syncDOM = function() {
      var chk;
      var cnd = data[cond];

      if (typeof cnd === "function") {
         chk = cnd() ? true: false;
      } else {
         chk = cnd ? true : false;
      }


      if (chk) {
         toggleTrue(dom[0]);
      } else {
         toggleFalse(dom[0]);
      }
   };

   refresher = function() {
      for(prop in data) {
         if (data.hasOwnProperty(prop)) {
            syncDOM(prop, data[prop]);
         }
      }
   }

   refresher();

   // give a refresher function to the handler
   if (typeof data[cond] === "function") {
      data[cond](refresher);
   }

   return refresher;
}


function bind_attr(data, dom, upd) {
   var syncDOM;
   var att;
   var pranaId;

   syncDOM = function(property, value) {
      var v, vis;
      var apply;
      var i, j;

      vis = visited(dom[0], property);
      if ((vis!==undefined) && vis.prop) {
         return;
      }

      if (value === undefined) {
         value = "";
      }

//      console.log("syncdom attr", property);

      apply = dom.data("bound_" + property);
      if (apply) {
         v = {};
         v[property] = value;
         dom.attr(property, apply(v));
//         dom[0].dispatchEvent(updateEvent);
      }
   }

   for(att in data) {
      if (data.hasOwnProperty(att)) {
         dom.data(
            "bound_" + att,
            applyer(data, "{{" + att + "}}")
         );

         pranaId = (""+performance.now()).replace(".","_");
         dom.data("pranaId", pranaId);
/*
         if (upd !== undefined) {
            dom[0].addEventListener("update", function(ev) {
               upd(ev);
            });
         }
*/
      }
   }

   if (upd !== undefined) {
      dom[0].addEventListener("update", function(ev) {
         upd(ev);
      });
   }

   return new Proxy(data, {
      apply: function(target, thisArg, argumentsList) {
         console.log("apply", target, thisArg, argumentsList, this, argumentList);
         return thisArg[target].apply(this, argumentList);
      },
      deleteProperty: function(target, property) {
         console.log("del", target, property);
         target.splice(parseInt(property, 10), 1);
         //$(dom[0].children[property]).remove();
         syncDOM(property, undefined);
         return true;
      },
      set: function(target, property, value, receiver) {
//         console.log("set arg", arguments);
         target[property] = value;
         syncDOM(property, value);

         setTimeout(triggerUpdate,500);

         return true;
      }
   });
}


function bind(data, dom, model, index, up, initialdata) {
   var tpl;
   var syncDOM;
   var prop;
   var bck, row;
   var bound;
   var apply;
   var att;
   var v;
   var $model;
   var ret;

   if (data.__isProxy !== undefined) {
      return data;
   }

   syncDOM = function(property, value) {
      var i, j, n;
      var node;
      var data;
      var dom, el;
      var v, vis;
      var apply;

      if (bound[property] === undefined) {
         return;
      }

      if (value === undefined) {
         value = "";
      }

//      console.log("syncdom", property);

      for(i=0; i<bound[property].length; i++) {
         dom = bound[property][i];

         vis = visited(dom.dom[0], property);
         if ((vis!==undefined) && vis.prop) {
            continue;
         }

         if (dom.txt !== undefined) {


            apply = dom.dom.data("tbound_" + dom.txt);
            if (apply) {
               for(
                  n=parseInt(dom.txt, 10), el=dom.dom[0].firstChild;
                  n>=0;
                  n--, el=el.nextSibling
               ) {
                  v = {};
                  v[property] = value;
                  el.data = apply(v);
               }
            }

         } else if (dom.att !== undefined) {
            apply = dom.dom.data("bound_" + property);
            if (apply) {
               v = {};
               v[property] = value;
//               console.log("syncdom apply", "att", dom.att, "property", property, "=", value);
               dom.dom.attr(dom.att, apply(v));
//               console.log("attr", property, "=", dom.dom.attr(property));
            }
         } else if (dom.cond !== undefined) {
//            console.log("dom.cond", dom.cond);
            dom.cond();
         }

         if (prana.propagate[dom.dom[0].localName] !== undefined) {
            prana.propagate[dom.dom[0].localName](dom.dom[0], dom.att, value);
         }

      }
   }

//   console.trace("data", data);

   $model = $(model)

   bound = template(data, $model, syncDOM);
   if (index === undefined) {
      dom.append($model);
      if (up !== undefined) {
         for(att in initialdata) {
            if (initialdata.hasOwnProperty(att)) {
               // In this block (initialdata) only:
               // both the variable AND the attribute
               // have the same name
               if (bound[att] === undefined) {
                  bound[att] = [];
               }
               bound[att].push({
                  dom: dom,
                  att: att
               });

               dom.data(
                  "bound_" + att,
                  applyer(initialdata, "{{" + att + "}}")
               );

               var pranaId = (""+performance.now()).replace(".","_");
               dom.data("pranaId", pranaId);
            }
         }
      }
   }

   for(prop in data) {
      if (data.hasOwnProperty(prop)) {
         syncDOM(prop, data[prop]);
      }
   }

   data.sync = function() {
      var k;

      for(k in data) {
         if (data.hasOwnProperty(k)) {
            syncDOM(k, data[k]);
         }
      }
   }

   ret = new Proxy(data, {
      apply: function(target, thisArg, argumentsList) {
         console.log("apply", target, thisArg, argumentsList, this, argumentList);
         return thisArg[target].apply(this, argumentList);
      },
      get: (target, key) => {

         if (key == "destroyDOM") {
            return function() {
               dom.remove();
            };
         }

         if (key !== "__isProxy") {
           return target[key];
         }

         return true;
      },
      deleteProperty: function(target, property) {
         console.log("del", target, property);
         target.splice(parseInt(property, 10), 1);
         //$(dom[0].children[property]).remove();
         syncDOM(property, undefined);
         return true;
      },
      set: function(target, property, value, receiver) {
//         console.log("set arg", arguments);
/*
         if (Array.isArray(value)) {
            bind_array(value, dom, property);
         } else
*/
         if (typeof value === 'object' && value !== null) {
            target[property] = bind(value, dom, $model);
         } else {
            target[property] = value;
         }

         syncDOM(property, value);

         setTimeout(triggerUpdate,500);

         return true;
      }
   });

   return ret;
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
                  defs[i].useShadow = mod.useShadow;
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
            customElements.define(
               modkeys[i],
               class extends HTMLElement {
                  constructor() {
                     var initialData = {};
                     var dataProxy;
                     var html;
                     var css;
                     var j;
                     var att;
                     var useShadow = false;
                     var ready;
                     var self;
                     var up;
                     var root;
                     var attProxy;

                     super();
                     self = this;
                     this.data = {};

                     html = defs[i].html.content.cloneNode(true).children[0];
                     if (defs[i].css !== undefined) {
                        css = defs[i].css.cloneNode(true);
                     }

                     for(j=0; j<self.attributes.length; j++) {
                        att = self.attributes[j];
                        if (
                           (att.name=="data-shadow") &&
                           (
                              (att.value=="open") ||
                              (att.value=="closed")
                           )
                        ) {
                           useShadow = att.value;
                        } else {
                           this.data[att.name] = att.value;
                           initialData[att.name] = att.value;
                        }
                     }

                     if (defs[i].useShadow) {
                        // Attach a shadow root to the element.
                        let shadowRoot = self.attachShadow({mode: defs[i].useShadow});
                        if (css !== undefined) {
                           shadowRoot.appendChild(css);
                        }
                        root = document.createElement("SPAN");
                        shadowRoot.appendChild(root);
                        root.appendChild(html);
                        up = 1;
                     } else {
                        if (css !== undefined) {
                           document.body.appendChild(css);
                        }
                        self.appendChild(html);
                        root = self;
                        up = 1;
                     }

                     ready = function(resolve, reject) {
//                        console.log("resolve data", data);
                        if (dataProxy !== undefined) {
//                           console.error("self after", self);
                           setTimeout(
                              function () {
                                 resolve({
                                    this: dataProxy,
                                    dom: root
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

//                     console.error("self before", self);
                     dataProxy = bind(
                        defs[i].js.call(this.data, new Promise(ready)),
                        $(root),
                        $(html),
                        undefined, // no index, this not an array row
                        up,
                        initialData
                     );

//                     bind_attr_new(data, $(root), dataProxy);
//                     attProxy = bind_attr(data, $(root), dataProxy.onUpdate);
                     prana.propagate[modkeys[i]] = function(dom, property, value) {
                        var $root;

                        if (defs[i].useShadow && dom.shadowRoot) {
                           $root = $(dom.shadowRoot.lastChild);
                        } else {
                           $root = $(dom.lastChild);
                        }

                        $root.attr(property,value);
                        dataProxy[property] = value;
                     };

                     for(att in initialData) {
                        if (initialData.hasOwnProperty(att)) {
                           prana.propagate[modkeys[i]]($(root), att, initialData[att]);
                        }
                     }

//                     console.log("self", self);
//                     console.log("html", html);

                  }
               }
            );
         });
      }
   }

};


export default prana;
