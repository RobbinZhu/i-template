# i-template

A nodejs template engine with full functions.

## Installation

```bash
$ npm install i-template
```

```js
var template = require('i-template');
template.render('<%=hi%>', {
    hi: 'Hello World'
}, function(e, text) {
    console.log(text); //Hello World
});
```

## Features

  * EJS grammar like
  * Control flow with `<% %>`
  * Output with `<%= %>`
  * Literal output with `<%$ $%>`
  * Complies with the [Express](http://expressjs.com) view system
  * Master page support
  * Sections support
  * Includes support
  * Cache of template compiled functions
  * Cache of common sections
  * Custom delimiters (e.g., use '<? ?>' instead of '<% %>')

## Quick Start
  The quickest way to get started with i-template

## Sample data define
```js
var person = {
  name: 'Robbin'
};
```

## Value output with sample data
```html
<%=name%>
```

```html
Robbin
```

## Raw output with sample data(output without parse)
```html
<%$=user.name$%>
```

```html
=user.name
```

## Integrate with Express.JS
```js
app.set('view engine', 'i-template');
app.engine('i-template', template.__express);
```

## Master page
```html

## Section
  section placeholder
```html
<div class="head">
  <%*logo%>
  <div class="menu">
  </div>
</div>
```
  section define
```html
<%# logo:
<div class="logo">
  <a href="/">
    <img src="/logo.jpg" alt="">
  </a>
</div>
#%>
```
  output
```html
<div class="head">
  <div class="logo">
  <a href="/">
    <img src="/logo.jpg" alt="">
  </a>
</div>
  <div class="menu">
  </div>
</div>
```

```
## Include

## Cache
