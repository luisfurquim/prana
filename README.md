# Prana
Prana is an open-source, simple javascript-based platform for front-end web application development.

The first version (prana.js) was my first attempt to design such a solution and got relatively feature mature.
But its bugs relied on design concepts in such a way that I realized that it would need to be rewritten from scratch.
So I started to code the second version (prana2.js) which is the only version one should use.
The first version is on the repository only for historical/study purposes.
Please avoid using it on any production basis! You have been warned!

So, the second version is also innapropriated for production use, but I'm working to reach the point where it may be used soon.
Especifically it has no support for form elements handle.
This is my next target now.
Also, there's no support yet for expression handling (I mean no operators like '+', '-', '*', etc).
This will be addressed later.

Obviously any contribution (feedback, bug reports, patches, stars, buzz on the media, etc.) will be appreciated!

Eventually someone could point out that this project is like a competitor to great popular platforms (like Angular, React, Vue, etc.) and, different from them, is a very small, simple and limited solution.
So, that's exactly the point: it is a solution intended to be small and simple!


# How to use it

In Prana you design your front end application in modules.
Each module must be in its own folder and must have a main javascript file and a main HTML file.
Optionally you may have a CSS file too.
All these files must be named after the folder name (so, if your module is called 'xyz', the
folder must be named 'xyz' and the files will be 'xyz.js', 'xyz.html' and (optionally)
'xyz.css').
You may have any other files in you module folders, but it's your job to ensure they will be
properly loaded.
Each module will be integrated in the application as a definition of a custom HTML tag.

So, begin importing Prana as a module and start it indicating which modules to load, for example:


```Javascript
   <script type="module">

   import prana from "./prana2.js";

   prana.def({
      dir: "./my-modules/",
      modules: {
         "prana-teste": "pranaTeste",
         "prana-teste2": "pranaTeste2"
      }
   });

   </script>

```

In the example above, we defined a module root folder localized at the './my-modules' folder, just below the main application folder.
So, the module 'pranaTeste' will be at the './my-modules/pranaTeste' folder and will be invoked in the html application with the element tag '```<prana-teste></prana-teste>```'.
Additionally , the module 'pranaTeste2' will be at the './my-modules/pranaTeste2' folder and will be invoked in the html application with the element tag '```<prana-teste2></prana-teste2>```'.

Example:

```Html
<body>
   <prana-teste></prana-teste>
</body>
```


## Writing a Module

For the pranaTeste module, create an HTML template file in your module folder (./my-modules/pranaTeste/pranaTeste.html), like the example below:

```Html
<div>
   <prana-teste2 b="{{b}}" d="{{d}}" ndx="-"></prana-teste2>
   <hr/>
   <div ?isBig>{{a.length}}: {{msgBig}}</div>
   <hr/>
   <div ?isSmall>{{a.length}}: {{msgSmall}}></div>
   <hr/>
   <prana-teste2 *a:i b="{{b}}" d="{{d}}" ndx="{{i}}"></prana-teste2>
</div>
```

Then create a javascript module (./my-modules/pranaTeste/pranaTeste.js) to build its logic:

```Javascript
export const attr = [];
export default function pranaTeste(ready) {
   var self = this;

   this.a = [
      {b: "abc", d:"123", e:"@#$"},
      {b: "def", d:"456", e:"%&*"},
      {b: "ghi", d:"789", e:"<>:"}
   ];

   this.b = "yadda yadda";
   this.d = "Lorem ipsum";
   this.msgBig = "is big!";
   this.msgSmall = "is small!";

   this.isbig = function() {
      return self.a.length > 2;
   };

   this.issmall = function() {
      return self.a.length <= 2;
   };

   ready.then(function(obj) {
      console.log("obj", obj);
      obj.this.a[2].b = "jkl";
      setTimeout(function() {
         obj.this.a[1].b = "mno";
         setTimeout(function() {
            obj.this.a[0].b = "pqr";
         }, 2000);
      }, 2000);
   });

   return this;
}
```

For the pranaTeste2 module, our pranaTeste2.html could be defined just in this way:
```Html
<div>{{b}} {{d}}</div>
```

And our pranaTeste2.js:
```Javascript
export const attr = ['b', 'd', 'ndx'];
export default function pranaTeste(ready) {
   this.b = "";
   this.d = "";
   this.ndx = "";

   ready.then(function(obj) {
      setTimeout(function() {
         obj.this.d = "tytyty" + obj.this.ndx;
      }, 7000);
   });

   return this;
}
```

So, in each module, you need to export a list of the accepted attributes as an array of strings named 'attr' containg a list of them and the main function as default.

The main function has one argument of Promise type, you can name it as you wish, but a good standard could be naming it 'ready'.
The function called by resolving the Promise receives one argument.
I named it with the highly creative ( :P ) 'obj' name, feel free to suggest a more adequate one!
This parameter has two properties:
* this: is the main 'this' object, the same that you may have added some properties. But it also may have some properties added/updated if the HTML which inserted the custom tag element that invoked your module has defined any attribute values. In this case, those attribute values will create/update properties named after these attributes.
* dom: is the dom root of your template.

The properties you assign to the 'this' variable will be accessible by the HTML template through the brace syntax or through the array or conditional syntax.

The brace syntax is used inside attribute values and text nodes. Just refer to the 'this' property name (without the 'this' keyword) inside double braces, as you can see above.

The conditional syntax is just a question mark character before the refered property, used as an HTML attribute name with no value setting it (without the '=""'). When Prana finds an attribute whose name starts with a question mark it resolves its value to a boolean condition. If the property refered by the attribute name is a function, it calls the function in order to solve the boolean value. If the solved value is true the HTML element is displayed according to normal HTML rendering rules. If the solved value is false, then the HTML element is converted into an HTML comment.
**Note that I left a 'gotcha' on you: in the HTML template, the conditional attributes were written in camel case (with capital 'B' and 'S' letters) and in the bound functions in 'this' property they are entirely in small letters. That's the problem: the browser HTML parser ignores attributes name case and I did not find any way to circunvent it, I just accepted that this is a limitation that I must live with**.
I'm hearing any suggestions on this issue...

The array syntax is just a star sign character before the refered property, used as an HTML attribute name with no value setting it (without the '=""'). When Prana finds an attribute whose name starts with a star sign character it expects the referenced property to be an array and binds this HTML element to the array items, producing more or less elements according to any change you make in the bound array. In the example above you can see that ```*a:i``` attribute which means that Prana will bind the 'a' property of 'this' to the HTML element and also will create a loop control variable named 'i' which will be visible only in the HTML template and just in the array bound element and in its descendants.

At the end of your main function, you MUST return 'this' to Prana.

## Propagation

Under certain conditions, Prana automatically propagates values across Prana modules.
There are three types of propagation:
* Propagation down;
* Propagation up;
* Propagation on form elements.

### Propagation Down;

Propagation down occurs whenever you change a property in a module's 'this' which is used to define the value of an attribute of an element's tag of another module.

See the example below:


```HTML
<!-- Parent-Module template-->
<child-module a="Answer: {{x}}"></child-module>
```

```Javascript
// Parent-module code
export const attr = [];
export default function parentModule(ready) {
   this.x = "";

   ready.then(function(obj) {
      setTimeout(function() {
         obj.this.x = "42";
      }, 3000);
   });

}

```



```HTML
<!-- Child-Module template-->
{{a}}
```

```Javascript
// Child-module code
export const attr = ['a'];
export default function childModule(ready) {
   this.a = "";

   ready.then(function(obj) {
      console.log("before changing a=", obj.this.a);
      setTimeout(function() {
         console.log("After changing a=", obj.this.a);
      }, 4000);
   });

}

```

So, the parent module's template invoke the child module by using its element tag and binds its attribute 'a' to a brace expression which depends on it's property 'x'.
According to parent's logic, after 3 seconds its 'x' property is changed from "" to "42".
This fires a value propagation, first changing the HTML from its own template (making the attribute change to "Answer: 42" ).
Because this is an attribute of a Prana module's element tag, propagation continues across module boudaries and so the child module's property 'a' changes its value from "Answer: " to "Answer: 42".
Finally, by modifying 'a' property's value, the child's module template is also changed because it is bound to the corresponding property, according to the brace syntax.





### Propagation Up;

Propagation up is a bit trickier.
In theory it would be just a propagation in the other direction.
But there are some limitations.

Let's change the modules to the codes below:

```Javascript
// Parent-module code
export const attr = [];
export default function parentModule(ready) {
   this.x = "";

   ready.then(function(obj) {
      setTimeout(function() {
         obj.this.x = "42";
         setTimeout(function() {
            console.log("After changing x=", obj.this.x);
         }, 6000);
      }, 3000);
   });

}

```

```Javascript
// Child-module code
export const attr = ['a'];
export default function childModule(ready) {
   this.a = "";

   ready.then(function(obj) {
      console.log("before changing a=", obj.this.a);
      setTimeout(function() {
         console.log("After changing a=", obj.this.a);
         setTimeout(function() {
            obj.this.a = "21 + 21";
         }, 4000);
      }, 4000);
   });

}

```

After 8 seconds, the child module will change its 'a' property to "21 + 21".
It will change the template according to the bind using the brace syntax.
But this will be all the propagation you'll see.
No propagation of any value will happen to the parent module.

Now, change the parent module to this:

```HTML
<!-- Parent-Module template-->
<child-module a="{{x}}"></child-module>
```

Now, as you can see, after 8 seconds, the child module will change it a property to "21 + 21".
As this property is bound to the module's element tag attribute, this will fire a propagation up to parent module.
And because parent module bound 'a' attribute of child to its 'x' property, this property will also change to "21 + 21".

So, why we saw no propagation from the child to the parent in the first example?
That's because propagation up only occurs when the bind is limited to the value of the property and not a bit more.
In other words 'a={{x}}' binds 'a' with 'x', but 'a="Answer: {{x}}"' doesn't bind them because of the presence of the 'Answer: ' string.


### Propagation on form elements

Suppose your Prana module has these HTML template and javascript logic shown below:

```HTML
<input type="text" value="{{x}}"/>
<select value="{{s}}">
   <option value="1">One</option>
   <option value="2">Two</option>
   <option value="3">Three</option>
</select>
<textarea>{{t}}</textarea>
```

```Javascript
export const attr = [];
export default function myModule(ready) {
   this.x = "Some text";
   this.s = 2;
   this.t = "Initial text";

   ready.then(function(obj) {
      setTimeout(function() {
         obj.this.x = "New auto input";
         obj.this.s = 3;
         obj.this.t = "New auto text";

         setTimeout(function() {
            console.log("obj.this", obj.this);
         }, 10000);
      }, 10000);
   });

}
```

After ten seconds all the three form elements will have their values changed according to its bindings to the corresponding 'this' properties.
And, after this, before the next ten seconds passes, if you manually change their values on the rendered page, you will see in the console window that the values you entered in the form elements were propagated back to the corresponding properties on your 'this'.

**Oops! There was another gotcha here! only the values you entered in the 'input' and 'select' fields were propagated back to the properties on 'this'!!! The value of the textarea wasn't propagated back!**.
So, change your HTML template to the example below:

```HTML
<input type="text" value="{{x}}"/>
<select value="{{s}}">
   <option value="1">One</option>
   <option value="2">Two</option>
   <option value="3">Three</option>
</select>
<textarea value="{{t}}"></textarea>
```

Now, after reloading the page and trying the steps above again, you will see that all text entered in the textarea field was propagated back accordingly.

**Notice: here the backpropagation follow the same rules of propagation up: it only occurs when the bind is limited to the value of the property and not a bit more**.


