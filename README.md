## Monopoly Politics
The code for generating [FairVote's Monopoly Politics Map]() resides here. We
use [`d3`](https://d3js.org/) to create each of the charts and Github's
[`tab-container-element`](https://github.com/github/tab-container-element) for
the tab effect.

### Installation and Building
Just run `$ npm i` to install all the necessary dependencies. To build, run
`$ npm run build:dev`, which will copy necessary `.css` files, bundle
dependencies, and open `dist/index.html` in your default browser. If you make
changes to any of the scripts, the project will have to be rebuilt using the
same command; changes to styles should automatically be populated (although you
must build the project again for them to be included in the `./dist/` folder).