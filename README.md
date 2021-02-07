# Guitar neck using D3

Simple class wrapper in a style I liked, based on code <a href="https://observablehq.com/@awhitty/fretboard#tonal">here</a>, so thank you A. Whitty.

The API is super simple, and requires D3 & tonal.js:

```javascript
  const w = 1024,
    h = 300;
  const svg = d3.create("svg").attr("viewBox", [0, 0, w, h]);

  let scale = key + " " + scaleType;

  new GuitarNeck(svg).size(w, h).render(scale);

  return svg.node();
```

See it live in action at Observable: https://observablehq.com/@euphrasiologist/scales