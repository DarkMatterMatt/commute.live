const gulp = require("gulp");
const ts = require("gulp-typescript");
const sass = require("gulp-sass");
const autoprefixer = require("gulp-autoprefixer");
const tsConfig = require("./tsconfig.json");

gulp.task("html", () => gulp
    .src("src/html/*.html")
    .pipe(gulp.dest("dist")));

gulp.task("scss", () => gulp
    .src("src/scss/*.scss")
    .pipe(sass())
    .pipe(autoprefixer({ cascade: false }))
    .pipe(gulp.dest("dist")));


gulp.task("ts", () => gulp
    .src("src/ts/*.ts")
    .pipe(ts(tsConfig.compilerOptions))
    .pipe(gulp.dest("dist")));

gulp.task("watch", () => {
    gulp.watch("src/html/*.html", gulp.series("html"));
    gulp.watch("src/scss/*.scss", gulp.series("scss"));
    gulp.watch("src/ts/*.ts", gulp.series("ts"));
});

exports.default = gulp.parallel("ts", "html", "scss", "watch");
