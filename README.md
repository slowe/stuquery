# stuquery

A lightweight DOM manipulator. I created this because jQuery was getting far too big and I only needed a few basic features. I've tried to replicate the function names and calling methods from jQuery to make it easy to switch back-and-forth. Rather than `$` I've used `E`;

## Functions

```javascript
E(document).ready(function)
E(selector).html(string)
E(selector).append(string)
E(selector).off(event)          // Try to remove an event with attached data and supplied function, fn.
E(selector).on(event,{},function)
E(selector).trigger(event)
E(selector).focus()
E(selector).blur()
E(selector).remove()
E(selector).hasClass(class)     // return true/false depending on existence of class
E(selector).toggleClass(class)
E(selector).addClass(class)
E(selector).removeClass(class)
E(selector).css(css)            // Structure containing the CSS to apply
E(selector).parent()            // return the parent element
E(selector).children(selector)  // return the children that have the selector
E(selector).find(selector)      // return the descendents that have the selector
E(selector).attr(attr,val)      // set an attribute
E(selector).attr(attr)          // get an attribute
E(selector).prop(attr,val)
E(selector).clone()             // get a clone of the first item
E(selector).replaceWith(string) // replace a selected DOM element with new HTML
E(selector).ajax(url,attrs)     // load a file
```
