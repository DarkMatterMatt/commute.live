module.exports = opts => {
    const env = opts.dev ? "dev" : "prod";
    console.log(`🛠️  running ${env} Mode using ./webpack/webpack.${env}.js 🛠️`);
    return require(`./webpack.${env}.js`);
};
