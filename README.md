# stuquery

A lightweight DOM manipulator. I created this because jQuery was getting far too big and I only needed a few basic features. I've tried to replicate the function names and calling methods from jQuery to make it easy to switch back-and-forth. Rather than `$` I've used `S`;

## Functions

```javascript
S(document).ready(function)      // Called once the document is ready
S(selector).html(string)         // Set the HTML content of the selected element(s)
S(selector).html()               // Return the HTML content of the selected element
S(selector).append(string)       // Add some HTML to the element(s)
S(selector).off(event)           // Try to remove an event with attached data and supplied function, fn.
S(selector).on(event,{},function)// Attach a callback function (and optional data) to an event on an element
S(selector).trigger(event)       // Trigger an event on the element
S(selector).focus()
S(selector).blur()
S(selector).remove()
S(selector).hasClass(class)      // return true/false depending on existence of class
S(selector).toggleClass(class)
S(selector).addClass(class)
S(selector).removeClass(class)
S(selector).css(css)             // Structure containing the CSS to apply
S(selector).parent()             // return the parent element
S(selector).children(selector)   // return the children that have the selector
S(selector).find(selector)       // return the descendents that have the selector
S(selector).attr(attr,val)       // set an attribute
S(selector).attr(attr)           // get an attribute
S(selector).prop(attr,val)
S(selector).clone()              // get a clone of the first item
S(selector).replaceWith(string)  // replace a selected DOM element with new HTML
S(selector).ajax(url,attrs)      // load a file
```
