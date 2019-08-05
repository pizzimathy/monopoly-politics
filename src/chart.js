
import * as d3 from "d3";
import * as raw_data from "./data//data";
import { CongressMapData } from "./data/map";


/**
 * @author Anthony Pizzimenti
 * @desc Creates a graph with `n` vertices and `k` edges. For the love of all
 * that is holy *please* do not use this to create complete graphs.
 * @param {number} n Number of vertices to create.
 * @param {number} k Number of edges to draw. Defaults to (n^2+1)/2.
 * @returns {object} d3 graph object with `nodes` and `links` properties.
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


/**
 * @author Anthony Pizzimenti
 * @desc Eventually, this function will become an AJAX request to wherever the
 * graph data is stored. I do *not* want to bundle and load all this data into
 * the DOM by packaging it as js, because that's awful and will affect load
 * times like no other.
 * @returns {object} Graph data.
 */
function graphFromData() {
    return raw_data.default;
}


/**
 * @author Anthony Pizzimenti
 * @desc Creates and charts the seat plot.
 * @returns {undefined}
 */
function seat_chart() {
    const graph = graphFromData(),          // Create graph from data.
        simulation = d3.forceSimulation(),  // Initialize the simulation.
        svg = d3.select("#seats-svg"),      // Select the svg DOM object.
        wwidth = screen.availWidth,         // Get available width/height.
        wheight = screen.availHeight;

    // Assign some attributes to the svg.
    svg
        .attr("width", wwidth/2)
        .attr("height", wheight/2);

    // Create some new variables based on the width and height of the svg. Note
    // that the + operator converts the return value to a numerical expression.
    const width = +svg.attr("width"),
        height = +svg.attr("height");

    // Fire up the simulation in a number of steps:
    //  1.  Add all the nodes.
    //  2.  Add an x-axis force, wherein we try to force all Republican dots to
    //      2/3rds of the way to the right boundary of the chart (to the
    //      *right*) and all Democratic dots 1/3rd of the way to the right
    //      boundary of the chart (to the *left*).
    //  3.  Add a y-axis force where every dot tries to get to the middle.
    //  4.  Add a collision force where all the dots try to move toward each
    //      other. Set a radius of 7 so they aren't so nestled.
    //  5.  Add a link force so dots that are connected try to move toward each
    //      other.
    simulation
        .nodes(graph.nodes, (d) => d.id)
        .force("x", d3.forceX().x((d) => d.party == "r" ? (2*width)/3 : width/3))
        .force("y", d3.forceY().y(height/2))
        .force("collision", d3.forceCollide().radius(7))
        .force("links", d3.forceLink(graph.links).id((d) => d.id));
    
    // Add nodes. Since d3 is weird, I'll note what each line is doing.
    //  1.  Appends a g-tag element to the svg DOM element.
    //  2.  Sets the class of the g-tag element to `nodes`.
    //  3.  Creates a bunch of `circle` elements.
    //  4.  Creates a `circle` element for each data point.
    //  5.  Joins the data to each `circle` element.
    //  6.  Appends each circle element to svg.
    //  7.  Sets the radius attribute of each circle to 5.
    //  8.  Sets the fill attribute of each circle to the color specified in the
    //      data of each node.
    var node = svg
        .append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 5)
        .attr("fill", (d) => d.color);

    // Add some hover text.
    node.append("title").text((d) => d.id);

    // Add links. Basically the same thing as adding nodes.
    var link = svg
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke-width", 2);

    // Set a click counter to check whether we're turning edges on or off.
    var clicks = 0;

    // Function that, based on the number of clicks, decides whether we're
    // redrawing with no edges or redrawing with edges.
    const which_redraw = (d, i) => {
        clicks += 1
        clicks % 2 == 1 ? redraw_no_edges(simulation, svg, link) : redraw_edges(simulation, svg, graph, link);
    }
    
    // On every `tick` event for the simulation, call `tick_actions`. Then, for
    // every `mouseup` event, decide how to redraw the chart.
    simulation.on("tick", tick_actions(node, link));
    svg.on("mouseup", which_redraw);
    svg.on("wheel", shuffle(simulation, svg, graph, node));
}


/**
 * @author Anthony Pizzimenti
 * @desc Callback for returning a function to adjust node positions in the svg.
 * @param {object} node d3 node collection object.
 * @param {object} link d3 link collection object.
 * @returns {function} Gunction for updating node positions in the svg.
 */
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


/**
 * @author Anthony Pizzimenti
 * @desc Makes the links visible, reapplies the link force, then restarts the
 * simulation.
 * @param {object} simulation d3 simulation object.
 * @param {object} svg d3 svg object.
 * @param {object} graph d3-formatted graph object.
 * @param {object} link d3 link collection object.
 * @returns {undefined}
 */
function redraw_edges(simulation, svg, graph, link) {
    link = svg
        .selectAll("line")
        .attr("stroke-width", 2);

    simulation.force("links", d3.forceLink(graph.links).id((d) => d.id));
    simulation.alpha(1).restart();
}


/**
 * @author Anthony Pizzimenti
 * @desc Makes all links invisible, removes the link force, then restarts the
 * simulation.
 * @param {object} simulation d3 simulation object.
 * @param {svg} svg d3 svg object.
 * @param {object} link d3 link collection object.
 * @returns {undefined}
 */
function redraw_no_edges(simulation, svg, link) {
    link = svg
        .selectAll("line")
        .attr("stroke-width", 0);

    simulation.force("links", null);
    simulation.alpha(1).restart();
}


/**
 * @author Anthony Pizzimenti
 * @desc Function that returns a callback for the `mouseup` event. Picks a
 * random number of representatives to change parties, then animates the change.
 * @param {object} simulation d3 simulation object.
 * @param {object} svg d3 svg object.
 * @param {object} graph d3-formatted graph object.
 * @param {object} node d3 node collection object.
 * @returns {function} Callback for when the `mouseup` event is fired.
 */
function shuffle(simulation, svg, graph, node) {
    return (d, i) => {
        // Randomly select a number in the range [0, 435]; this number is the number
        // of representatives whose parties will be switched.
        var switches = Math.floor(Math.random() * graph.nodes.length),
            height = +svg.attr("height"),
            width = +svg.attr("width");
        
        for (var i = 0; i < switches; i++) {
            var member = Math.floor(Math.random() * graph.nodes.length),
                random_member = graph.nodes[member];

            random_member.party = random_member.party == "r" ? "d" : "r";
            random_member.color = random_member.color == "blue" ? "red" : "blue";
        }

        // Re-add the data to the node objects and start the transition.
        node = node.data(graph.nodes, (d) => d.id);
        node.exit().remove();

        // Perform a merge on the node data so that the changed nodes change, and
        // the untouched ones don't.
        node = node
            .enter()
            .append("circle")
            .attr("r", 5)
            .merge(node)
            .attr("fill", (d) => d.color);

        // Specify that we're using the new `graph.nodes` data in the simulation.
        simulation.nodes(graph.nodes);

        // Reapply forces.
        simulation
            .force("x", d3.forceX().x((d) => d.party == "r" ? (2*width)/3 : width/3))
            .force("y", d3.forceY().y(height/2))
            .force("collision", d3.forceCollide().radius(7));
        
        // Restart the simulation.
        simulation.alpha(1).restart();
    }
}


/**
 * @author Anthony Pizzimenti
 * @desc Charts the map with data adjoined.
 * @returns {undefined}
 */
function map_chart() {
    const wwidth = screen.availWidth,
        wheight = screen.availHeight,

        // Create the d3 svg object, but also get the DOM object.
        svg = d3.select("#geographic-svg"),
        svg_el = document.getElementsByClassName("svg-container")[0],

        // Find the bounding box for the svg.
        top_left = [svg_el.offsetLeft, svg_el.offsetTop],
        bottom_right = [svg_el.offsetLeft + wwidth/2, svg_el.offsetTop + wheight/2],

        // Create the chart and make sure that the map is fitted to the chart.
        projection = d3.geoAlbersUsa().fitExtent([top_left, bottom_right], CongressMapData),
        path = d3.geoPath().projection(projection);

    const color = (d) => {
        return d.properties.party == "(R)" ? "#ba0c00" : "#0739ff";
    }

    // Do all the styling things!
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

    // Modify the party member counts.
    count_party_members(CongressMapData);
}


/**
 * @author Anthony Pizzimenti
 * @desc Counts the number of members for each party, then appends the data to
 * the chart.
 * @param {object} data Graph data object.
 */
function count_party_members(data) {
    var dems = 0,
        reps = 0;

    const dem_el = document.getElementById("democrats"),
        rep_el = document.getElementById("republicans");

    for (var i = 0; i < data.features.length; i++) data.features[i].properties.party == "(R)" ? reps++ : dems++;

    rep_el.innerText = reps + " Republicans";
    dem_el.innerText = dems + " Democrats";
}

export { seat_chart, map_chart }