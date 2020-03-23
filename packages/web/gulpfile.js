/* eslint-disable @typescript-eslint/no-var-requires */

const gulp = require("gulp");
const ts = require("gulp-typescript");
const sass = require("gulp-sass");
const sourcemaps = require("gulp-sourcemaps");
const autoprefixer = require("gulp-autoprefixer");
const browserSync = require("browser-sync").create();
const tsConfig = require("./tsconfig.json");

gulp.task("serve", () => {
    browserSync.init({
        server: {
            baseDir: "./dist",
        },
    });
});

gulp.task("images", () => gulp
    .src("src/images/*")
    .pipe(gulp.dest("dist/images"))
    .pipe(browserSync.reload({ stream: true })));

gulp.task("html", () => gulp
    .src("src/html/*.html")
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.reload({ stream: true })));

gulp.task("scss", () => gulp
    .src("src/scss/*.scss")
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer({ cascade: false }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.reload({ stream: true })));

gulp.task("ts", () => gulp
    .src("src/ts/*.ts")
    .pipe(sourcemaps.init())
    .pipe(ts(tsConfig.compilerOptions))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.reload({ stream: true })));

gulp.task("watch", () => {
    gulp.watch("src/images/*", gulp.series("images"));
    gulp.watch("src/html/*.html", gulp.series("html"));
    gulp.watch("src/scss/*.scss", gulp.series("scss"));
    gulp.watch("src/ts/*.ts", gulp.series("ts"));
});

exports.default = gulp.parallel("serve", "images", "html", "scss", "ts", "watch");
