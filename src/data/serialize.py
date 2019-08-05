
import csv
import itertools
import json
import random
import networkx as nx


graph = { "nodes": [], "links": [] }
people = []

with open("./monopoly-data.csv", "r") as f:
    csv = csv.reader(f)

    # Iterate over the rows and add vertices to the graph.
    for row in csv:
        name = row[2] + " " + row[3]
        party = "r" if row[4] == "(R)" else "d"
        state = row[0]
        color = "red" if party == "r" else "blue"

        node = {
            "id": name,
            "party": party,
            "state": state,
            "color": color 
        }

        people.append(node)

    # Now, we want to add edges: this might take a bit.
    combos = list(itertools.combinations(people, 2))
    states = {}
    people = { node["id"]: node for node in people }
    
    for source, target in combos:
        if source["state"] == target["state"]:
            state = source["state"]
            if states.get(state, None):
                states[state] += [(source, target)]
            else:
                states[state] = [(source, target)]

    for state in states:
        G = nx.Graph()
        vertices = { e[0]["id"] for e in states[state] }
        vertices.union({ e[1]["id"] for e in states[state] })
        edges = { (e[0]["id"], e[1]["id"]) for e in states[state] }

        G.add_nodes_from(vertices)
        G.add_edges_from(edges)

        T = nx.minimum_spanning_tree(G)

        for node in T.nodes():
            graph["nodes"].append(people[node])
        
        for u, v in T.edges():
            graph["links"].append({ "source": u, "target": v })

with open("serialized-monopoly-data.json", "w") as wf:
    json.dump(graph, wf)