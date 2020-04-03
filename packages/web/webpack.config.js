module.exports = env => {
    console.log(`🛠️  running ${env} Mode using ./webpack/webpack.${env}.js 🛠️`);
    return require(`./webpack.${env}.js`);
};
