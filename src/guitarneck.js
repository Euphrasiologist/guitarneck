import { Note, Scale } from "@tonaljs/tonal";
import * as d3 from "d3";

export default class GuitarNeck {
    constructor(parentSVG) {
        this.parent = parentSVG;
        // size of chart
        this.totalWidth = 1024;
        this.totalHeight = Math.max(this.totalWidth / 6, 300);

        this.margin = {
            top: 120,
            right: 10,
            left: 30,
            bottom: 30
        };

        // tuning, number of strings/frets
        this.tuning = ["E4", "B3", "G3", "D3", "A2", "E2"];
        this.parsedTuning = this.tuning.map(Note.get);
        this.numStrings = this.tuning.length;
        this.minFret = 0;
        this.maxFret = Math.round(this.totalWidth / 48);

        // data
        this.placements = null;
        // scale
        this.scale = null;
        // tooltip
        this.tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "svg-tooltip")
            .attr("class", "tiplabs")
            .style("font-family", "sans-serif")
            .style("position", "absolute")
            .style("text-align", "center")
            .style("visibility", "hidden")
            .style("border-style", "solid")
            .style("border-color", "black")
            .style("background-color", "white")
            .style("list-style", "none")
            .style("width", "20px");
    }

    size(width, height) {
        this.totalWidth = width;
        this.totalHeight = height;
        return this;
    }

    // get the notes of the scale
    getNotes(scale) {
        let arr = [];
        for (let i = 0; i < 6; i++) {
            let int_string =
                scale.split(" ")[0] +
                i +
                " " +
                scale
                    .split(" ")
                    .slice(1, scale.split(" ").length)
                    .join(" ");
            let notes = Scale.scale(int_string).notes;
            arr.push(notes);
        }
        // return notes
        return arr.flat();
    }

    // place the notes onto a string
    placeNote(noteOrStr) {
        const note = Note.get(noteOrStr);
        return this.parsedTuning
            .map(string => note.height - string.height)
            .map((fret, stringIndex) =>
                fret >= this.minFret && fret <= this.maxFret
                    ? { note, fret, string: stringIndex + 1 }
                    : null
            )
            .filter(Boolean);
    }

    // return to data
    addScale(scale) {
        this.scale = scale;
        this.placements = this.getNotes(scale)
            .map(d => this.placeNote(d))
            .flat();
    }

    drawFretBoard() {
        const stringToY = d3
            .scaleLinear()
            .domain([1, this.numStrings])
            .range([this.margin.top, this.totalHeight - this.margin.bottom]);

        const fretToX = d3
            .scaleLinear()
            .domain([this.minFret, this.maxFret])
            .range([this.margin.left, this.totalWidth - this.margin.right]);

        const g1 = this.parent.append("g");

        g1.selectAll('.string')
            .data(d3.range(1, this.numStrings + 1))
            .join('line')
            .attr('class', 'string')
            .attr('stroke', 'black')
            .attr('x1', fretToX(this.minFret))
            .attr('x2', fretToX(this.maxFret))
            .attr('y1', d => stringToY(d))
            .attr('y2', d => stringToY(d))
            .attr('stroke-width', 3);

        g1.selectAll('.fret')
            .data(d3.range(this.minFret, this.maxFret + 1))
            .join('line')
            .attr('class', 'fret')
            .attr('stroke', 'black')
            .attr('y1', stringToY(1) - .5)
            .attr('y2', stringToY(this.numStrings) + .5)
            .attr('x1', d => fretToX(d))
            .attr('x2', d => fretToX(d))
            .attr('stroke-width', d => (d === 0 ? 5 : 3));

        const g2 = this.parent.append("g");
        g2.append("g")
            .attr('transform', `translate(${this.margin.left - 10}, -0.5)`)
            .style("font-size", "20px")
            .call(
                d3
                    .axisLeft()
                    .scale(stringToY)
                    .ticks(this.numStrings)
                    .tickSize(0)
            )
            .call(g => g.select(".domain").remove());

        g2.append("g")
            .attr(
                'transform',
                `translate(${-(fretToX.range()[1] / this.maxFret) / 2}, ${this
                    .totalHeight -
                this.margin.bottom +
                12})`
            )
            .style("font-size", "10px")
            .call(
                d3
                    .axisBottom()
                    .scale(fretToX)
                    .ticks(this.maxFret - this.minFret)
                    .tickSize(0)
                    .tickFormat(x => (x > 0 ? x : ""))
            )
            .call(g => g.select(".domain").remove());

        // a group

        const g3 = this.parent.append("g");
        const tooltip = this.tooltip;

        g3.selectAll('placement')
            .data(this.placements)
            .join('circle')
            .attr('class', 'placement')
            .attr('id', d => d.note.pc)
            .attr('cx', d => fretToX(d.fret - 0.5))
            .attr('cy', d => stringToY(d.string))
            .attr('fill', 'black')
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .attr('r', d => (d.fret - 0.5 < 0 ? 0 : 8))
            // eslint-disable-next-line
            .on("pointerenter", function (event, d) {
                g3.selectAll('#' + d.note.pc).attr('fill', 'orange');
                tooltip.style("visibility", "visible");
            })
            .on("pointermove", function (event, d) {
                g3.selectAll('#' + d.note.pc).attr('fill', 'orange');

                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px")
                    .style("color", "black")
                    .style("font-style", "normal")
                    .html(`${d.note.pc}`)
                    .style("font-family", "sans-serif");
            })
            // eslint-disable-next-line
            .on("pointerleave", function (event, d) {
                g3.selectAll('#' + d.note.pc).attr('fill', 'black');
                tooltip.style("visibility", "hidden");
            });
    }

    // add html text

    addHTML() {
        const g4 = this.parent.append("g");

        g4.append("foreignObject")
            //.attr("transform", (d, i) => "translate(20,250)")
            .attr("width", this.totalWidth / 2)
            .attr("height", this.margin.top)
            .append("xhtml:div")
            .attr("class", "textbox")
            .style("font", "19px 'Helvetica Neue'")
            .html(
                `<h1>Scale: ${this.scale}</h1><p>Containing the notes: ${Array.from(
                    new Set(this.placements.map(d => d.note.pc))
                ).map(d => " " + d)}</p>`
            );
    }

    render(scale) {
        this.addScale(scale);
        this.drawFretBoard();
        this.addHTML();
        return this;
    }
}