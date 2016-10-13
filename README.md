# stuquery

A lightweight DOM manipulator. I created this because jQuery was getting far too big and I only needed a few basic features. I've tried to replicate the function names and calling methods from jQuery to make it easy to switch back-and-forth. Rather than `$` I've used `S`;

## Functions

```javascript
S(document).ready(function)
S(selector).html(string)
S(selector).append(string)
S(selector).off(event)          // Try to remove an event with attached data and supplied function, fn.
S(selector).on(event,{},function)
S(selector).trigger(event)
S(selector).focus()
S(selector).blur()
S(selector).remove()
S(selector).hasClass(class)     // return true/false depending on existence of class
S(selector).toggleClass(class)
S(selector).addClass(class)
S(selector).removeClass(class)
S(selector).css(css)            // Structure containing the CSS to apply
S(selector).parent()            // return the parent element
S(selector).children(selector)  // return the children that have the selector
S(selector).find(selector)      // return the descendents that have the selector
S(selector).attr(attr,val)      // set an attribute
S(selector).attr(attr)          // get an attribute
S(selector).prop(attr,val)
S(selector).clone()             // get a clone of the first item
S(selector).replaceWith(string) // replace a selected DOM element with new HTML
S(selector).ajax(url,attrs)     // load a file
```
