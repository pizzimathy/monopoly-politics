
import * as d3 from "d3";
import * as raw_data from "./data//data";
import { CongressMapData } from "./data/map";


/**
 * @author Anthony Pizzimenti
 * @desc Creates a graph with `n` vertices and `k` edges.
 * @param {number} n Number of vertices to create.
 * @param {number} k Number of edges to draw. Defaults to (n^2+1)/2.
 */
function createRandomGraph(n, k) {
    // Create the structure for a d3.js graph. Those Sankey diagrams make a lot
    // more sense now.
    var graph = { "nodes": [], "links": [] },
        vertices = [],
        edges = [],
        k = k ? k : (n*(n-1))/2,
        j = 0;

    // Create vertices.
    for (var i = 0; i < n; i++) vertices.push({ id: i, radius: 2 })

    // Create edges. This is a lame algorithm and isn't particularly efficient,
    // but it's just to create some fake graphs.
    while (j < k) {
        var ri = Math.floor(Math.random() * 10),
            rj = Math.floor(Math.random() * 10),
            includes = edges.filter(e => (e[0]==ri && e[1]==rj) || (e[0]==rj && e[1]==ri)).length > 0;

        // We don't want to create self-loops and we also don't want to create
        // edges that already exist. Simple graphs, people! None of that
        // multigraph stuff.
        if (ri == rj || includes) continue;

        // Add the edge to our list of edges and increment our counter.
        edges.push([ri, rj])
        j++
    }

    // Now, create the graph object.
    graph["nodes"] = vertices;
    for (var e of edges) graph["links"].push({ source: e[0], target: e[1] });

    return graph;
}

function graphFromData() {
    return raw_data.default;
}

function dot_chart() {
    const graph = graphFromData(),
        simulation = d3.forceSimulation(),
        svg = d3.select("#seats-svg"),
        wwidth = screen.availWidth,
        wheight = screen.availHeight;

    svg
        .attr("width", wwidth/2)
        .attr("height", wheight/2);

    const width = +svg.attr("width"),
        height = +svg.attr("height");

    // Fire up the simulation.
    simulation
        .nodes(graph.nodes, (d) => d.id)
        .force("x", d3.forceX().x((d) => d.party == "r" ? (2*width)/3 : width/3))
        .force("y", d3.forceY().y(height/2))
        .force("collision", d3.forceCollide().radius(7))
        .force("links", d3.forceLink(graph.links).id((d) => d.id));
    
    // Add nodes.
    var node = svg
        .append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 5)
        .attr("fill", (d) => d.color);

    node.append("title").text((d) => d.id);

    // Add links.
    var link = svg
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke-width", 2);

    var clicks = 0;

    const which_redraw = (d, i) => {
        clicks += 1
        clicks % 2 == 1 ? redraw_no_edges(simulation, svg, link) : redraw_edges(simulation, svg, graph, link);
    }
    
    simulation.on("tick", tick_actions(node, link));
    svg.on("mouseup", which_redraw);
}

function tick_actions(node, link) {
    return () => {
        node
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y);

        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    }
}

function redraw_edges(simulation, svg, graph, link) {
    link = svg
        .selectAll("line")
        .attr("stroke-width", 2);

    simulation.force("links", d3.forceLink(graph.links).id((d) => d.id));
    simulation.alpha(1).restart();
}

function redraw_no_edges(simulation, svg, link) {
    link = svg
        .selectAll("line")
        .attr("stroke-width", 0);

    simulation.force("links", null);
    simulation.alpha(1).restart();
}

function shuffle(d, i) {
    var switches = Math.floor(Math.random() * graph.nodes.length);
    for (var i = 0; i < switches; i++) {
        var member = Math.floor(Math.random() * graph.nodes.length),
            random_member = graph.nodes[member];
        
        random_member.party = random_member.party == "r" ? "d" : "r";
        random_member.color = random_member.color == "blue" ? "red" : "blue";
    }

    node = node.data(graph.nodes, (d) => d.id);
    node.exit().remove();
    node = node
        .enter()
        .append("circle")
        .attr("r", 5)
        .merge(node)
        .attr("fill", (d) => d.color);

    simulation.nodes(graph.nodes);
    simulation
        .force("x", d3.forceX().x((d) => d.party == "r" ? (2*width)/3 : width/3))
        .force("y", d3.forceY().y(height/2))
        .force("collision", d3.forceCollide().radius(7));
    simulation.alpha(1).restart();
}

function map_chart() {
    const wwidth = screen.availWidth,
        wheight = screen.availHeight,
        svg = d3.select("#geographic-svg"),
        svg_el = document.getElementsByClassName("svg-container")[0],
        top_left = [svg_el.offsetLeft, svg_el.offsetTop],
        bottom_right = [svg_el.offsetLeft + wwidth/2, svg_el.offsetTop + wheight/2],
        projection = d3.geoAlbersUsa().fitExtent([top_left, bottom_right], CongressMapData),
        path = d3.geoPath().projection(projection);

    const color = (d) => {
        return d.properties.party == "(R)" ? "#ba0c00" : "#0739ff";
    }

    svg
        .attr("width", wwidth/2)
        .attr("height", wheight/2)
        .selectAll("path")
        .data(CongressMapData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke", "#fff")
        .style("stroke-width", 0.5)
        .style("fill", color)
        .text((d) => d.properties.District + " – " + d.properties.Incumbent);

    count_party_members(CongressMapData);
}

function count_party_members(data) {
    var dems = 0,
        reps = 0;

    const dem_el = document.getElementById("democrats"),
        rep_el = document.getElementById("republicans");

    for (var i = 0; i < data.features.length; i++) data.features[i].properties.party == "(R)" ? reps++ : dems++;

    rep_el.innerText = reps + " Republicans";
    dem_el.innerText = dems + " Democrats";
}

export { dot_chart, map_chart }