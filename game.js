var canvas;
var gl;
var program;
var rubiksCube;

var vColor;
var vPosition;
var projectionMatrix = mat4();
var modelViewMatrix = mat4();

const cubeIndices = [];
const stickerIndices = [];
const stickerMargin = 0.006;

const FACE = {};
FACE[255] = {};
FACE[0] = {};
FACE[255][255] = {};
FACE[255][0] = {};
FACE[0][255] = {};
FACE[0][0] = {};
FACE[255][0][0] = 1;
FACE[0][255][0] = 6;
FACE[0][0][255] = 3;
FACE[255][255][0] = 2;
FACE[0][255][255] = 5;
FACE[255][0][255] = 4;

var eye = null;
var angle = 0.0;
var axis = 0;
var radius = 2.5;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var FOV = 45.0;
var aspect = 1.0;
var near = 1;
var far = 10000;
var theta = radians(45);
var phi = radians(45);

var rotateTheta = 3;
var currentTheta = 0;
var isFaceRotating = false;
const timer = 1;
var interval = null;
var saveText;
const MOVES = ["L", "l", "R", "r", "U", "u", "D", "d", "F", "f", "B", "b", "M", "m", "E", "e", "S", "s"];

var mouseLeftDown = false;
var mouseRightDown = false;
var cubeRotating = false;
var init_x;
var init_y;
var new_x;
var new_y;
var CANVAS_X_OFFSET;
var CANVAS_Y_OFFSET;

var time = 0;
var min = 0;
var sec = 0;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true, premultipliedAlpha: false});

    CANVAS_X_OFFSET = canvas.offsetLeft;
    CANVAS_Y_OFFSET = canvas.offsetTop;

    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0,0,0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    rubiksCube = new RubiksCube();

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.enableVertexAttribArray(vColor);

	const Timer=document.getElementById('Timer');
	Timer.value=min+":"+'00';
	
    canvas.addEventListener("mousedown", startRotate);
    canvas.addEventListener("mouseup", stopRotate);
    canvas.addEventListener("mousemove", rotating);
    canvas.addEventListener("oncontextmenu", (event) => {
        event.preventDefault();
    });

    saveText = document.getElementById("saveText");
    document.getElementById("saveButton").onclick = () => {
        rubiksCube.save();
    };

    document.getElementById("loadButton").onclick = () => {
        load();
    };

    document.getElementById("shuffle").onclick = () => {
        const shuffleNum = document.getElementById("shuffleNum").value;
        rubiksCube.shuffle(shuffleNum);
    };

    document.getElementById("reset").onclick = () => {
        reset();
    };

    render();
	TIMER();
};

function render() {
    if (rubiksCube.queue.length !== 0 && !isFaceRotating) {
        rubiksCube.animate(rubiksCube.queue.shift());
        isFaceRotating = true;
    }
    requestAnimFrame(render);
    rubiksCube.draw(0);
}

function TIMER(){
    PlAYTIME = setInterval(function(){
        time = time + 1000;
        min = time / (60*1000);

        sec = (sec + 1) % 60;
        Timer.value=Math.floor(min)+':'+sec;     
   
    },1000); 
}

class RubiksCube {
    constructor() {
        this.cubeVerticesBuffer = null;
        this.cubeColorsBuffer = null;
        
        this.cubeSelectBuffer = null;
        
        this.cubeFaceBuffer = null;
        this.cubeFaceVerticesBuffer = null;
        
        this.stickerVerticesBuffer = null;
        this.stickerColorsBuffer = null;

        this.cubeVertices = [];
        this.cubeColors = [];
        this.cubeSelects = [];
        this.cubeFaces = [];
        this.cubeFaceVertices = [];
        this.stickerVertices = [];
        this.stickerColors = [];

        this.cubes = new Array(3);
        this.starts = {x: -0.15, y: -0.15, z: -0.15};
        this.ends = {x: 0.15, y: 0.15, z: 0.15};
        this.cubeSize = 0.30;
        this.rotatingCubes = [];
        this.queue = [];
        this.storage = [];

        this.selectedCube1 = null;
        this.selectedCube2 = null;
        this.selectedFace1 = null;
        this.selectedFace2 = null;

        this.initCubes();
        this.buildFaceCube();
        this.initCubeBuffers();
        this.initStickerBuffers();

        cubeIndices.push(this.cubeVertices.length);
        stickerIndices.push(this.stickerVertices.length);
    }

    initCubes() {
        for (var i = 0; i < 3; i++) {
            this.cubes[i] = new Array(3);
            for (var j = 0; j < 3; j++) {
                this.cubes[i][j] = new Array(3);
                for (var k = 0; k < 3; k++) {
                    const coordinate = [i - 1, j - 1, k - 1];
                    this.cubes[i][j][k] = new Cube(this, coordinate);
                }
            }
        }
    }

    initCubeBuffers() {
        this.cubeVerticesBuffer = gl.createBuffer();
        this.cubeColorsBuffer = gl.createBuffer();
        this.cubeSelectBuffer = gl.createBuffer();
        this.cubeFaceBuffer = gl.createBuffer();
        this.cubeFaceVerticesBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.cubeVertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeColorsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.cubeColors), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeSelectBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.cubeSelects), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeFaceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.cubeFaces), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeFaceVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.cubeFaceVertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    }

    initStickerBuffers() {
        this.stickerVerticesBuffer = gl.createBuffer();
        this.stickerColorsBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.stickerVertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerColorsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.stickerColors), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    }

    rotate() {
        this.selectedCube1.coordinates.map(x => Math.round(x));
        this.selectedCube2.coordinates.map(x => Math.round(x));

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("F");
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("r");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, 0, 1]) || arraysEqual(this.selectedCube1.coordinates, [1, -1, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 1, 1]) || arraysEqual(this.selectedCube2.coordinates, [1, 0, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("f");
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("R");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("L");
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("f");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("l");
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("F");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("R");
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("b");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("r");
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("B");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("B");
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("l");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("b");
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("L");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [1, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("r");
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("U");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [1, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("R");
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("u");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("L");
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("u");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("l");
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("U");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [-1, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("D");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("l");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [-1, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("d");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("L");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [1, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("D");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("r");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [1, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("d");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("R");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, 1]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("U");
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("f");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, 1]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("u");
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("F");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, -1]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("U");
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("b");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, -1]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("u");
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("B");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, -1]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("d");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("B");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, -1]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("D");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("b");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, 1]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("D");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("f");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, 1]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("d");
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("F");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [0, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [0, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("M");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [0, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [0, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("m");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [0, 1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [0, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("M");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [0, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [0, 1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("m");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [0, -1, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [0, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("M");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [0, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [0, -1, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("m");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [0, -1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [0, 1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("M");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [0, 1, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [0, -1, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("m");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, 0]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("S");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, 0]) || arraysEqual(this.selectedCube1.coordinates, [0, 1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 1, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 5) rubiksCube.pushTurn("s");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, 0]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, 1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("S");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 1, 0]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("s");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, 0]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, -1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("S");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, -1, 0]) || arraysEqual(this.selectedCube1.coordinates, [0, -1, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, -1, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 6) rubiksCube.pushTurn("s");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 1, 0]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, -1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("S");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, -1, 0]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, 1, 0]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("s");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 0, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [1, 0, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("E");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, 0, 1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, 1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, 1]) || arraysEqual(this.selectedCube2.coordinates, [-1, 0, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 1) rubiksCube.pushTurn("e");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 0, 1]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, 0, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("E");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [1, 0, -1]) || arraysEqual(this.selectedCube1.coordinates, [1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [1, 0, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 2) rubiksCube.pushTurn("e");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [1, 0, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [-1, 0, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("E");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 0, -1]) || arraysEqual(this.selectedCube1.coordinates, [0, 0, -1])) &&
            (arraysEqual(this.selectedCube2.coordinates, [0, 0, -1]) || arraysEqual(this.selectedCube2.coordinates, [1, 0, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 3) rubiksCube.pushTurn("e");
            }
        }

        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 0, -1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, 0, 1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("E");
            }
        }
        if ((arraysEqual(this.selectedCube1.coordinates, [-1, 0, 1]) || arraysEqual(this.selectedCube1.coordinates, [-1, 0, 0])) &&
            (arraysEqual(this.selectedCube2.coordinates, [-1, 0, 0]) || arraysEqual(this.selectedCube2.coordinates, [-1, 0, -1]))) {
            if (this.selectedFace1 === this.selectedFace2) {
                if (this.selectedFace1 === 4) rubiksCube.pushTurn("e");
            }
        }
    }

    draw(option) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        eye = vec3(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
        modelViewMatrix = lookAt(eye, at, up);
        projectionMatrix = perspective(FOV, aspect, near, far);
        if (option === 0) {
            var cnt = 0;
            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    for (var k = 0; k < 3; k++) {
                        cnt++;
                        if (i === 1 && j === 1 && k === 1) continue;
                        this.cubes[i][j][k].draw(cnt);
                    }
                }
            }
        } else if (option === 1) {
            setMatrixToProgram();
            gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeVerticesBuffer);
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeSelectBuffer);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, rubiksCube.cubeVertices.length);

        } else if (option === 2) {
            setMatrixToProgram();
            gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeFaceVerticesBuffer);
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeFaceBuffer);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, rubiksCube.cubeFaceVertices.length);
        }
    }

    selectFace(x, y) {
        const pixelColor = new Uint8Array(4);
        rubiksCube.draw(2);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelColor);
        const r = pixelColor[0];
        const g = pixelColor[1];
        const b = pixelColor[2];
        return FACE[r][g][b];
    }

    selectCube(x, y) {
        const pixelColor = new Uint8Array(4);
        rubiksCube.draw(1);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelColor);
        const r = pixelColor[0];
        const g = pixelColor[1];
        const b = pixelColor[2];
        const a = pixelColor[3];
        if (r === 26 && g === 26 && b === 26) {
            return null;
        } else {
            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    for (var k = 0; k < 3; k++) {
                        if (a === this.cubes[i][j][k].alphaCheck) {
                            if (this.selectedCube1 && this.selectedCube1 !== this.cubes[i][j][k]) {
                                this.selectedCube2 = this.cubes[i][j][k];
                                this.selectedFace2 = this.selectFace(x, y);
                                return true;
                            } else {
                                this.selectedCube1 = this.cubes[i][j][k];
                                this.selectedFace1 = this.selectFace(x, y);
                                return true;
                            }
                        }
                    }
                }
            }
            return true;
        }
    }

    changeCubePosition(face) {
        var temp;
        for (var x = 0; x < 3; x++) {
            for (var y = 0; y < 3; y++) {
                for (var z = 0; z < 3; z++) {
                    switch (face) {
                        case "L":
                            if (this.cubes[x][y][z].cubePosition[0] === -1) {
                                temp = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[1];
                                this.cubes[x][y][z].rotationAxis[1] = negate(this.cubes[x][y][z].rotationAxis[2]);
                                this.cubes[x][y][z].rotationAxis[2] = temp;
                            }
                            break;
                        case "l":
                            if (this.cubes[x][y][z].cubePosition[0] === -1) {
                                temp = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[2];
                                this.cubes[x][y][z].rotationAxis[2] = negate(this.cubes[x][y][z].rotationAxis[1]);
                                this.cubes[x][y][z].rotationAxis[1] = temp;
                            }
                            break;
                        case "R":
                            if (this.cubes[x][y][z].cubePosition[0] === 1) {
                                temp = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[2];
                                this.cubes[x][y][z].rotationAxis[2] = negate(this.cubes[x][y][z].rotationAxis[1]);
                                this.cubes[x][y][z].rotationAxis[1] = temp;
                            }
                            break;
                        case "r":
                            if (this.cubes[x][y][z].cubePosition[0] === 1) {
                                temp = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = -temp;


                                temp = this.cubes[x][y][z].rotationAxis[1];
                                this.cubes[x][y][z].rotationAxis[1] = negate(this.cubes[x][y][z].rotationAxis[2]);
                                this.cubes[x][y][z].rotationAxis[2] = temp;
                            }
                            break;
                        case "U":
                            if (this.cubes[x][y][z].cubePosition[1] === 1) {
                                temp = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[0];
                                this.cubes[x][y][z].rotationAxis[0] = negate(this.cubes[x][y][z].rotationAxis[2]);
                                this.cubes[x][y][z].rotationAxis[2] = temp;
                            }
                            break;
                        case "u":
                            if (this.cubes[x][y][z].cubePosition[1] === 1) {
                                temp = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[2];
                                this.cubes[x][y][z].rotationAxis[2] = negate(this.cubes[x][y][z].rotationAxis[0]);
                                this.cubes[x][y][z].rotationAxis[0] = temp;
                            }
                            break;
                        case "D":
                            if (this.cubes[x][y][z].cubePosition[1] === -1) {
                                temp = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[2];
                                this.cubes[x][y][z].rotationAxis[2] = negate(this.cubes[x][y][z].rotationAxis[0]);
                                this.cubes[x][y][z].rotationAxis[0] = temp;
                            }
                            break;
                        case "d":
                            if (this.cubes[x][y][z].cubePosition[1] === -1) {
                                temp = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[0];
                                this.cubes[x][y][z].rotationAxis[0] = negate(this.cubes[x][y][z].rotationAxis[2]);
                                this.cubes[x][y][z].rotationAxis[2] = temp;
                            }
                            break;
                        case "E":
                            if (this.cubes[x][y][z].cubePosition[1] === 0) {
                                temp = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[2];
                                this.cubes[x][y][z].rotationAxis[2] = negate(this.cubes[x][y][z].rotationAxis[0]);
                                this.cubes[x][y][z].rotationAxis[0] = temp;
                            }
                            break;
                        case "e":
                            if (this.cubes[x][y][z].cubePosition[1] === 0) {
                                temp = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[0];
                                this.cubes[x][y][z].rotationAxis[0] = negate(this.cubes[x][y][z].rotationAxis[2]);
                                this.cubes[x][y][z].rotationAxis[2] = temp;
                            }
                            break;
                        case "F":
                            if (this.cubes[x][y][z].cubePosition[2] === 1) {
                                temp = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[1];
                                this.cubes[x][y][z].rotationAxis[1] = negate(this.cubes[x][y][z].rotationAxis[0]);
                                this.cubes[x][y][z].rotationAxis[0] = temp;
                            }
                            break;
                        case "f":
                            if (this.cubes[x][y][z].cubePosition[2] === 1) {
                                temp = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[0];
                                this.cubes[x][y][z].rotationAxis[0] = negate(this.cubes[x][y][z].rotationAxis[1]);
                                this.cubes[x][y][z].rotationAxis[1] = temp;
                            }
                            break;
                        case "S":
                            if (this.cubes[x][y][z].cubePosition[2] === 0) {
                                temp = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[1];
                                this.cubes[x][y][z].rotationAxis[1] = negate(this.cubes[x][y][z].rotationAxis[0]);
                                this.cubes[x][y][z].rotationAxis[0] = temp;
                            }
                            break;
                        case "s":
                            if (this.cubes[x][y][z].cubePosition[2] === 0) {
                                temp = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[0];
                                this.cubes[x][y][z].rotationAxis[0] = negate(this.cubes[x][y][z].rotationAxis[1]);
                                this.cubes[x][y][z].rotationAxis[1] = temp;
                            }
                            break;
                        case "B":
                            if (this.cubes[x][y][z].cubePosition[2] === -1) {
                                temp = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[0];
                                this.cubes[x][y][z].rotationAxis[0] = negate(this.cubes[x][y][z].rotationAxis[1]);
                                this.cubes[x][y][z].rotationAxis[1] = temp;
                            }
                            break;
                        case "b":
                            if (this.cubes[x][y][z].cubePosition[2] === -1) {
                                temp = this.cubes[x][y][z].cubePosition[0];
                                this.cubes[x][y][z].cubePosition[0] = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[1];
                                this.cubes[x][y][z].rotationAxis[1] = negate(this.cubes[x][y][z].rotationAxis[0]);
                                this.cubes[x][y][z].rotationAxis[0] = temp;
                            }
                            break;
                        case "M":
                            if (this.cubes[x][y][z].cubePosition[0] === 0) {
                                temp = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[1];
                                this.cubes[x][y][z].rotationAxis[1] = negate(this.cubes[x][y][z].rotationAxis[2]);
                                this.cubes[x][y][z].rotationAxis[2] = temp;
                            }
                            break;
                        case "m":
                            if (this.cubes[x][y][z].cubePosition[0] === 0) {
                                temp = this.cubes[x][y][z].cubePosition[1];
                                this.cubes[x][y][z].cubePosition[1] = this.cubes[x][y][z].cubePosition[2];
                                this.cubes[x][y][z].cubePosition[2] = -temp;

                                temp = this.cubes[x][y][z].rotationAxis[2];
                                this.cubes[x][y][z].rotationAxis[2] = negate(this.cubes[x][y][z].rotationAxis[1]);
                                this.cubes[x][y][z].rotationAxis[1] = temp;
                            }
                    }
                }
            }
        }
    }

    pushTurn(face) {
        this.storage.push(face);
        this.queue.push(face);
    }

    animate(action) {
        const self = this;
        interval = setInterval(() => {
            self.callRotation(action)
        }, timer);
    }

    callRotation(face) {
        this.turn(face);
        currentTheta += rotateTheta;
        if (currentTheta === 90) {
            clearInterval(interval);
            isFaceRotating = false;
            currentTheta = 0;
            this.changeCubePosition(face);
            if (this.checkSolved()) {
                alert("Rubik's Cube Solved");
            }
        }
    }

    checkSolved() {
        const defaultOrientation = this.cubes[0][0][0].rotationAxis;
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                for (var x = 0; x < 3; x++) {
                    for (var y = 0; y < 3; y++) {
                        for (var z = 0; z < 3; z++) {
                            if (this.cubes[x][y][z].rotationAxis[i][j] !== defaultOrientation[i][j]) {
                                if (x === 1 && z === 1) {
                                    if (this.cubes[x][y][z].rotationAxis[1][j] !== defaultOrientation[1][j]) {
                                        return false;
                                    }
                                } else if (x === 1 && y === 1) {
                                    if (this.cubes[x][y][z].rotationAxis[2][j] !== defaultOrientation[2][j]) {
                                        return false;
                                    }
                                } else if (y === 1 && z === 1) {
                                    if (this.cubes[x][y][z].rotationAxis[0][j] !== defaultOrientation[0][j]) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    turn(face) {
        var direction, value, mainAxis;
        switch (face) {
            case "L":
                mainAxis = 0;
                value = -1;
                direction = "L";
                break;
            case "l":
                mainAxis = 0;
                value = -1;
                direction = 0;
                break;
            case "R":
                mainAxis = 0;
                value = 1;
                direction = 0;
                break;
            case "r":
                mainAxis = 0;
                value = 1;
                direction = "r";
                break;
            case "M":
                mainAxis = 0;
                value = 0;
                direction = "M";
                break;
            case "m":
                mainAxis = 0;
                value = 0;
                direction = 0;
                break;
            case "U":
                mainAxis = 1;
                value = 1;
                direction = 0;
                break;
            case "u":
                mainAxis = 1;
                value = 1;
                direction = "u";
                break;
            case "D":
                mainAxis = 1;
                value = -1;
                direction = "D";
                break;
            case "d":
                mainAxis = 1;
                value = -1;
                direction = 0;
                break;
            case "E":
                mainAxis = 1;
                value = 0;
                direction = "E";
                break;
            case "e":
                mainAxis = 1;
                value = 0;
                direction = 0;
                break;
            case "F":
                mainAxis = 2;
                value = 1;
                direction = 0;
                break;
            case "f":
                mainAxis = 2;
                value = 1;
                direction = "f";
                break;
            case "B":
                mainAxis = 2;
                value = -1;
                direction = "B";
                break;
            case "b":
                mainAxis = 2;
                value = -1;
                direction = 0;
                break;
            case "S":
                mainAxis = 2;
                value = 0;
                direction = 0;
                break;
            case "s":
                mainAxis = 2;
                value = 0;
                direction = "s";
                break;
        }
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                for (var k = 0; k < 3; k++) {
                    var rtMatrix = rubiksCube.cubes[i][j][k].rotationMatrix;
                    if (rubiksCube.cubes[i][j][k].cubePosition[mainAxis] === value) {
                        if (!direction) {
                            rtMatrix = mult(rtMatrix, rotate(rotateTheta, rubiksCube.cubes[i][j][k].rotationAxis[mainAxis]));
                        } else {
                            rtMatrix = mult(rtMatrix, rotate(rotateTheta, negate(rubiksCube.cubes[i][j][k].rotationAxis[mainAxis])));
                        }
                        rubiksCube.cubes[i][j][k].rotationMatrix = rtMatrix;
                    }
                }
            }
        }
    }

    buildFaceCube() {
        this.normalQuad(1, 0, 3, 2);
        this.normalQuad(2, 3, 7, 6);
        this.normalQuad(3, 0, 4, 7);
        this.normalQuad(6, 5, 1, 2);
        this.normalQuad(4, 5, 6, 7);
        this.normalQuad(5, 4, 0, 1);
    }

    normalQuad(a, b, c, d) {
        const vertices = [
            vec4(-0.45, -0.45, 0.45, 1.0),
            vec4(-0.45, 0.45, 0.45, 1.0),
            vec4(0.45, 0.45, 0.45, 1.0),
            vec4(0.45, -0.45, 0.45, 1.0),
            vec4(-0.45, -0.45, -0.45, 1.0),
            vec4(-0.45, 0.45, -0.45, 1.0),
            vec4(0.45, 0.45, -0.45, 1.0),
            vec4(0.45, -0.45, -0.45, 1.0)
        ];

        const vertexColors = [
            [0.0, 0.0, 0.0, 1.0],  
            [1.0, 0.0, 0.0, 1.0], 
            [1.0, 1.0, 0.0, 1.0], 
            [0.0, 1.0, 0.0, 1.0],  
            [0.0, 0.0, 1.0, 1.0], 
            [1.0, 0.0, 1.0, 1.0],  
            [0.0, 1.0, 1.0, 1.0], 
            [1.0, 1.0, 1.0, 1.0]  
        ];

        const indices = [a, b, c, a, c, d];

        for (var i = 0; i < indices.length; i++) {
            this.cubeFaceVertices.push(vertices[indices[i]]);
            this.cubeFaces.push(vertexColors[a]);
        }
    }

    save() {
        saveText.value = JSON.stringify({
            turns: this.storage
        });
    }

    shuffle(shuffleNum) {
        console.log(shuffleNum);
        if (!isNaN(shuffleNum) && shuffleNum !== 0) {
            console.log(shuffleNum);
            for (var i = 0; i < shuffleNum; i++) {
                var rng = Math.round(Math.random() * MOVES.length) % MOVES.length;
                this.pushTurn(MOVES[rng]);
            }
        }
    }
}

class Cube {
    constructor(rubiksCube, coordinates) {
        this.coordinates = [...coordinates];
        this.cubePosition = [...coordinates];
        this.rotationAxis = [vec3(-1, 0, 0), vec3(0, -1, 0), vec3(0, 0, -1)];
        this.color = COLORS.black;
        this.rubiksCube = rubiksCube;
        this.rotationMatrix = mat4();
        
        this.alpha = 0.031 * (9 * (this.coordinates[0] + 1) + 3 * (this.coordinates[1] + 1) + (this.coordinates[2] + 1));
        this.alphaCheck = Math.round(255 * 0.031 * (9 * (this.coordinates[0] + 1) + 3 * (this.coordinates[1] + 1) + (this.coordinates[2] + 1)));
        this.buildCube(coordinates);
    }

    buildCube(coordinate) {
        cubeIndices.push(this.rubiksCube.cubeVertices.length);
        stickerIndices.push(this.rubiksCube.stickerVertices.length);
        this.quad(1, 0, 3, 2, coordinate);
        this.quad(2, 3, 7, 6, coordinate);
        this.quad(3, 0, 4, 7, coordinate);
        this.quad(6, 5, 1, 2, coordinate);
        this.quad(4, 5, 6, 7, coordinate);
        this.quad(5, 4, 0, 1, coordinate);
        this.createSticker(coordinate);
    }

    quad(a, b, c, d, coordinate) {
        const xOff = coordinate[0] * this.rubiksCube.cubeSize;
        const yOff = coordinate[1] * this.rubiksCube.cubeSize;
        const zOff = coordinate[2] * this.rubiksCube.cubeSize;
        const cubeVertices = [
            vec4(this.rubiksCube.starts.x + xOff, this.rubiksCube.starts.y + yOff, this.rubiksCube.ends.z + zOff, 1.0),
            vec4(this.rubiksCube.starts.x + xOff, this.rubiksCube.ends.y + yOff, this.rubiksCube.ends.z + zOff, 1.0),
            vec4(this.rubiksCube.ends.x + xOff, this.rubiksCube.ends.y + yOff, this.rubiksCube.ends.z + zOff),
            vec4(this.rubiksCube.ends.x + xOff, this.rubiksCube.starts.y + yOff, this.rubiksCube.ends.z + zOff, 1.0),
            vec4(this.rubiksCube.starts.x + xOff, this.rubiksCube.starts.y + yOff, this.rubiksCube.starts.z + zOff, 1.0),
            vec4(this.rubiksCube.starts.x + xOff, this.rubiksCube.ends.y + yOff, this.rubiksCube.starts.z + zOff, 1.0),
            vec4(this.rubiksCube.ends.x + xOff, this.rubiksCube.ends.y + yOff, this.rubiksCube.starts.z + zOff, 1.0),
            vec4(this.rubiksCube.ends.x + xOff, this.rubiksCube.starts.y + yOff, this.rubiksCube.starts.z + zOff, 1.0)
        ];

        const indices = [a, b, c, a, c, d];

        for (var i = 0; i < indices.length; i++) {
            this.rubiksCube.cubeVertices.push(cubeVertices[indices[i]]);
            this.rubiksCube.cubeColors.push(this.color);
            this.rubiksCube.cubeSelects.push([0, 0, 0, this.alpha]);
        }
    }

    stickerQuad(a, b, c, d, coordinate, xMargin, yMargin, zMargin) {
        const xOff = coordinate[0] * this.rubiksCube.cubeSize;
        const yOff = coordinate[1] * this.rubiksCube.cubeSize;
        const zOff = coordinate[2] * this.rubiksCube.cubeSize;

        const cubeVertices = [
            vec4(this.rubiksCube.starts.x + xOff + xMargin, this.rubiksCube.starts.y + yMargin + yOff, this.rubiksCube.ends.z + zMargin + zOff, 1.0),
            vec4(this.rubiksCube.starts.x + xOff + xMargin, this.rubiksCube.ends.y + yMargin + yOff, this.rubiksCube.ends.z + zMargin + zOff, 1.0),
            vec4(this.rubiksCube.ends.x + xOff + xMargin, this.rubiksCube.ends.y + yMargin + yOff, this.rubiksCube.ends.z + zMargin + zOff),
            vec4(this.rubiksCube.ends.x + xOff + xMargin, this.rubiksCube.starts.y + yMargin + yOff, this.rubiksCube.ends.z + zMargin + zOff, 1.0),
            vec4(this.rubiksCube.starts.x + xOff + xMargin, this.rubiksCube.starts.y + yMargin + yOff, this.rubiksCube.starts.z + zMargin + zOff, 1.0),
            vec4(this.rubiksCube.starts.x + xOff + xMargin, this.rubiksCube.ends.y + yMargin + yOff, this.rubiksCube.starts.z + zMargin + zOff, 1.0),
            vec4(this.rubiksCube.ends.x + xOff + xMargin, this.rubiksCube.ends.y + yMargin + yOff, this.rubiksCube.starts.z + zMargin + zOff, 1.0),
            vec4(this.rubiksCube.ends.x + xOff + xMargin, this.rubiksCube.starts.y + yMargin + yOff, this.rubiksCube.starts.z + zMargin + zOff, 1.0)
        ];
        const indices = [a, b, c, a, c, d];
        for (var i = 0; i < indices.length; ++i) {
            this.rubiksCube.stickerVertices.push(cubeVertices[indices[i]]);
        }
    }

    createSticker(coordinate) {
        const x = coordinate[0];
        const y = coordinate[1];
        const z = coordinate[2];
        if (x === -1) {
            const xMargin = -0.005;
            const yMargin = coordinate[1] * stickerMargin;
            const zMargin = coordinate[2] * stickerMargin;
            this.stickerQuad(5, 4, 0, 1, coordinate, xMargin, yMargin, zMargin);
            for (var i = 0; i < 6; i++) {
                this.rubiksCube.stickerColors.push(COLORS.red);
            }
        } else if (x === 1) {
            const xMargin = 0.005;
            const yMargin = coordinate[1] * stickerMargin;
            const zMargin = coordinate[2] * stickerMargin;
            this.stickerQuad(2, 3, 7, 6, coordinate, xMargin, yMargin, zMargin);
            for (var i = 0; i < 6; i++) {
                this.rubiksCube.stickerColors.push(COLORS.orange);
            }
        }

        if (y === -1) {
            const xMargin = coordinate[0] * stickerMargin;
            const yMargin = -0.005;
            const zMargin = coordinate[2] * stickerMargin;
            this.stickerQuad(3, 0, 4, 7, coordinate, xMargin, yMargin, zMargin);
            for (var i = 0; i < 6; i++) {
                this.rubiksCube.stickerColors.push(COLORS.blue);
            }
        } else if (y === 1) {
            const xMargin = coordinate[0] * stickerMargin;
            const yMargin = 0.005;
            const zMargin = coordinate[2] * stickerMargin;
            this.stickerQuad(6, 5, 1, 2, coordinate, xMargin, yMargin, zMargin);
            for (var i = 0; i < 6; i++) {
                this.rubiksCube.stickerColors.push(COLORS.green);
            }
        }

        if (z === -1) {
            const xMargin = coordinate[0] * stickerMargin;
            const yMargin = coordinate[1] * stickerMargin;
            const zMargin = -0.005;
            this.stickerQuad(4, 5, 6, 7, coordinate, xMargin, yMargin, zMargin);
            for (var i = 0; i < 6; i++) {
                this.rubiksCube.stickerColors.push(COLORS.yellow);
            }
        } else if (z === 1) {
            const xMargin = coordinate[0] * stickerMargin;
            const yMargin = coordinate[1] * stickerMargin;
            const zMargin = 0.005;
            this.stickerQuad(1, 0, 3, 2, coordinate, xMargin, yMargin, zMargin);
            for (var i = 0; i < 6; i++) {
                this.rubiksCube.stickerColors.push(COLORS.white);
            }
        }
    }

    transform() {
        modelViewMatrix = mult(modelViewMatrix, this.rotationMatrix);
    }

    draw(idx) {
        var mvMatrix = modelViewMatrix;
        this.transform();
        setMatrixToProgram();

        gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeVerticesBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeColorsBuffer);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, cubeIndices[idx - 1], cubeIndices[idx] - cubeIndices[idx - 1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.stickerVerticesBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.stickerColorsBuffer);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, stickerIndices[idx - 1], stickerIndices[idx] - stickerIndices[idx - 1]);

        modelViewMatrix = mvMatrix;
    }
}

function setMatrixToProgram() {
    const projectionUniform = gl.getUniformLocation(program, "projectionMatrix");
    gl.uniformMatrix4fv(projectionUniform, false, flatten(projectionMatrix));
    const modelViewUniform = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewUniform, false, flatten(modelViewMatrix));
}

function startRotate(event) {
    if (isLeftMouse(event)) mouseLeftDown = true;
    else if (isRightMouse(event)) mouseRightDown = true;
    init_x = event.x;
    init_y = event.y;
    if (mouseLeftDown) rubiksCube.selectCube(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
    if (rubiksCube.selectedCube1 && rubiksCube.selectedCube2) {
        rubiksCube.rotate();
        rubiksCube.selectedCube1 = null;
        rubiksCube.selectedCube2 = null;
        rubiksCube.selectedFace1 = null;
        rubiksCube.selectedFace2 = null;
    } else {
        cubeRotating = true;
    }
}

function rotating(event) {
    if (isFaceRotating) return false;
    if (cubeRotating && mouseRightDown) {
        new_x = event.pageX;
        new_y = event.pageY;
        const delta_x = (init_x - new_x) / 3;
        const delta_y = (init_y - new_y) / 3;

        const tmp_phi = Math.abs((phi / Math.PI * 180.0) % 360);

        if (tmp_phi > 180.0 && tmp_phi < 270.0 || phi < 0.0) {
            if ((phi / Math.PI * 180.0) % 360 < -180.0) {
                up = vec3(0.0, 1.0, 0.0);
                theta += -delta_x * 2 * Math.PI / canvas.width;
            } else {
                up = vec3(0.0, -1.0, 0.0);
                theta += delta_x * 2 * Math.PI / canvas.width;
            }
        } else {
            if (tmp_phi > 270.0) {
                up = vec3(0.0, -1.0, 0.0);
                theta += delta_x * 2 * Math.PI / canvas.width;
            } else {
                up = vec3(0.0, 1.0, 0.0);
                theta += -delta_x * 2 * Math.PI / canvas.width;
            }
        }
        phi += -delta_y * 2 * Math.PI / canvas.height;
        init_x = event.pageX;
        init_y = event.pageY;
        event.preventDefault();
    }
}

function stopRotate(event) {
    mouseLeftDown = false;
    mouseRightDown = false;
}

function negate(vec) {
    var temp = [];
    for (var i = 0; i < vec.length; i++) {
        temp[i] = -vec[i];
    }
    return temp;
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length)
        return false;
    for (var i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i])
            return false;
    }
    return true;
}

function isLeftMouse(event) {
    return event.button === 0;
}

function isRightMouse(event) {
    return event.button === 2;
}

function reset() {
    rubiksCube = new RubiksCube();
}

function load() {
    if (saveText.value !== "") {
        const loaded = JSON.parse(saveText.value).turns;
        rubiksCube = new RubiksCube();
        loaded.forEach((value) => rubiksCube.pushTurn(value));
    }
}