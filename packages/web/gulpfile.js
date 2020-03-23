/* eslint-disable @typescript-eslint/no-var-requires */

const gulp = require("gulp");
const ts = require("gulp-typescript");
const sass = require("gulp-sass");
const sourcemaps = require("gulp-sourcemaps");
const autoprefixer = require("gulp-autoprefixer");
const tsConfig = require("./tsconfig.json");

gulp.task("images", () => gulp
    .src("src/images/*")
    .pipe(gulp.dest("dist/images")));

gulp.task("html", () => gulp
    .src("src/html/*.html")
    .pipe(gulp.dest("dist")));

gulp.task("scss", () => gulp
    .src("src/scss/*.scss")
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer({ cascade: false }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("dist")));

gulp.task("ts", () => gulp
    .src("src/ts/*.ts")
    .pipe(sourcemaps.init())
    .pipe(ts(tsConfig.compilerOptions))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("dist")));

gulp.task("watch", () => {
    gulp.watch("src/images/*", gulp.series("images"));
    gulp.watch("src/html/*.html", gulp.series("html"));
    gulp.watch("src/scss/*.scss", gulp.series("scss"));
    gulp.watch("src/ts/*.ts", gulp.series("ts"));
});

exports.default = gulp.parallel("images", "html", "scss", "ts", "watch");
