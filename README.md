# Guitar neck using D3

Simple class wrapper in a style I liked, based on code <a href="https://observablehq.com/@awhitty/fretboard#tonal">here</a>, so thank you A. Whitty.

Development to come, want to make it more interative.

The API is super simple, and requires D3 & tonal.js:

```javascript
const w = 1024,
        h = 200;
const svg = d3.create("svg").attr("viewBox", [0, 0, w, h]);

let scale = "C melodic minor"

new GuitarNeck(svg).render(scale);

return svg.node();
```

See it live in action at Observable: https://observablehq.com/@euphrasiologist/scales