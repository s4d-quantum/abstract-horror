let webpack = require('webpack');
let path = require('path');

module.exports = {
    mode:"production",
    entry:"./assets/js/main.js",
    output:{
        filename:"bundle.js",
        path:path.resolve(__dirname,'./assets/dist')
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
          })
    ]
}