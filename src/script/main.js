/* global Automaton */

const xorshift = require( './libs/xorshift' );
const Tweak = require( './libs/tweak' );
const GLCat = require( './libs/glcat' );
const GLCatPath = require( './libs/glcat-path-gui' );
const MathCat = require( './libs/mathcat' );
const CanvasSaver = require( './libs/canvas-saver' );

const glslify = require( 'glslify' );

const $ = document.querySelector.bind( document );

// ------

xorshift( 326789157890 );

// ------

let width = $( '#canvas' ).width = 400;
let height = $( '#canvas' ).height = 400;

// ------

let canvasSaver = new CanvasSaver( $( '#canvas' ) );

// ------

let gl = $( '#canvas' ).getContext( 'webgl' );
gl.lineWidth( 1 );

let glCat = new GLCat( gl );

glCat.getExtension( 'OES_texture_float', true );
glCat.getExtension( 'OES_texture_float_linear', true );
glCat.getExtension( 'EXT_frag_depth', true );
glCat.getExtension( 'ANGLE_instanced_arrays', true );

let glCatPath = new GLCatPath( glCat, {
  el: $( '#divPath' ),
  canvas: $( '#canvas' ),
  stretch: true
} );

// ------

let tweak = new Tweak( $( '#divTweak' ) );

// ------

let totalFrame = 0;
let init = false;

let automaton = new Automaton( {
  gui: $( '#divAutomaton' ),
  fps: 60,
  loop: true,
  data: `
  {"v":"1.2.0","length":3,"resolution":1000,"params":{"dummy":[{"time":0,"value":0,"mode":1,"params":{},"mods":[false,false,false,false]},{"time":3,"value":0,"mode":1,"params":{},"mods":[false,false,false,false]}],"originZ":[{"time":0,"value":0,"mode":1,"params":{},"mods":[false,false,false,false]},{"time":3,"value":80,"mode":1,"params":{},"mods":[false,{"freq":1,"amp":9.7,"phase":0.5},false,false]}]},"gui":{"snap":{"enable":false,"bpm":120,"offset":0}}}
  `
} );
let auto = automaton.auto;
auto( 'dummy' );

let originZPrev = 0.0;

// ------

let cameraPos = [ 0.0, 0.0, 8.0 ];
let cameraTar = [ 0.0, 0.0, 0.0 ];
let cameraRoll = 0.0;
let cameraFov = 70.0;

let cameraNear = 0.1;
let cameraFar = 100.0;

let lightPos = [ 10.0, 8.0, 10.0 ];

let matP;
let matV;
let matPL;
let matVL;

let updateMatrices = () => {
  let x = Math.sin( 2.0 * Math.PI * automaton.progress );
  let y = -0.2 + 0.5 * Math.cos( 2.0 * Math.PI * automaton.progress );
  cameraPos = [ 4.0 + x, 2.0 + y, 6.0 + auto( 'originZ' ) ];
  cameraTar = [ x / 8.0, y / 8.0, 0.0 + auto( 'originZ' ) ];

  matP = MathCat.mat4Perspective( cameraFov, cameraNear, cameraFar );
  matV = MathCat.mat4LookAt( cameraPos, cameraTar, [ 0.0, 1.0, 0.0 ], cameraRoll );

  matPL = MathCat.mat4Perspective( cameraFov, cameraNear, cameraFar );
  matVL = MathCat.mat4LookAt( lightPos, cameraTar, [ 0.0, 1.0, 0.0 ], 0.0 );
};
updateMatrices();

// ------

let mouseX = 0.0;
let mouseY = 0.0;

$( '#canvas' ).addEventListener( 'mousemove', ( event ) => {
  mouseX = event.offsetX;
  mouseY = event.offsetY;
} );

// ------

let vboQuad = glCat.createVertexbuffer( [ -1, -1, 1, -1, -1, 1, 1, 1 ] );

// ------

let bgColor = [ 0.02, 0.02, 0.02, 1.0 ];

// ------

// let fbReduce = glCat.createFloatFramebuffer( width / 4, height / 4 );

// ------

glCatPath.setGlobalFunc( () => {
  glCat.uniform1i( 'init', init );
  glCat.uniform1f( 'time', automaton.time );
  glCat.uniform1f( 'progress', automaton.progress );
  glCat.uniform1f( 'automatonLength', automaton.data.length );
  glCat.uniform1f( 'deltaTime', automaton.deltaTime );
  glCat.uniform1f( 'originZ', auto( 'originZ' ) );
  glCat.uniform1f( 'originZDelta', auto( 'originZ' ) - originZPrev );

  glCat.uniform1f( 'totalFrame', totalFrame );
  glCat.uniform2fv( 'mouse', [ mouseX, mouseY ] );

  glCat.uniform3fv( 'cameraPos', cameraPos );
  glCat.uniform3fv( 'cameraTar', cameraTar );
  glCat.uniform1f( 'cameraRoll', cameraRoll );
  glCat.uniform1f( 'cameraFov', cameraFov );
  glCat.uniform1f( 'cameraNear', cameraNear );
  glCat.uniform1f( 'cameraFar', cameraFar );
  glCat.uniform3fv( 'lightPos', lightPos );

  glCat.uniformMatrix4fv( 'matP', matP );
  glCat.uniformMatrix4fv( 'matV', matV );
  glCat.uniformMatrix4fv( 'matPL', matPL );
  glCat.uniformMatrix4fv( 'matVL', matVL );
  glCat.uniform4fv( 'bgColor', bgColor );
} );

glCatPath.add( {
  return: {
    width: width,
    height: height,
    vert: glslify( './shaders/quad.vert' ),
    frag: glslify( './shaders/return.frag' ),
    blend: [ gl.ONE, gl.ZERO ],
    clear: [ 0.0, 0.0, 0.0, 1.0 ],
    func: ( path, params ) => {
      glCat.attribute( 'p', vboQuad, 2 );
      glCat.uniformTexture( 'sampler0', params.input, 0 );
      gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
    }
  },

  inspector: {
    width: width,
    height: height,
    vert: glslify( './shaders/quad.vert' ),
    frag: glslify( './shaders/inspector.frag' ),
    blend: [ gl.ONE, gl.ZERO ],
    clear: [ 0.0, 0.0, 0.0, 1.0 ],
    func: ( path, params ) => {
      glCat.attribute( 'p', vboQuad, 2 );
      glCat.uniform3fv( 'circleColor', [ 1.0, 1.0, 1.0 ] );
      glCat.uniformTexture( 'sampler0', params.input, 0 );
      gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
    }
  },

  'target': {
    width: width,
    height: height,
    vert: glslify( './shaders/quad.vert' ),
    frag: glslify( './shaders/bg.frag' ),
    blend: [ gl.ONE, gl.ZERO ],
    clear: [ 0.0, 0.0, 0.0, 1.0 ],
    framebuffer: true,
    float: true,
    depthWrite: false,
    func: () => {
      glCat.attribute( 'p', vboQuad, 2 );
      gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
    }
  },
} );

// ------

let updateUI = () => {
  let now = new Date();
  let deadline = new Date( 2018, 5, 22, 0, 0 );

  $( '#divCountdown' ).innerText = 'Deadline: ' + Math.floor( ( deadline - now ) / 1000 );
};

// ------

let update = () => {
  if ( !tweak.checkbox( 'play', { value: true } ) ) {
    setTimeout( update, 100 );
    return;
  }

  automaton.update();

  updateUI();
  updateMatrices();

  // ------

  glCatPath.begin();

  glCatPath.render( 'target' );

  glCatPath.render( 'particlesComputeReturn' );
  glCatPath.render( 'particlesCompute' );

  glCatPath.render( 'particlesRender', {
    target: glCatPath.fb( 'target' ),
    width: width,
    height: height
  } );

  glCatPath.render( 'preBloom', {
    input: glCatPath.fb( 'target' ).texture,
    bias: [ -0.7, -0.6, -0.4 ],
    factor: [ 0.1, 0.1, 0.1 ],
  } );

  glCatPath.render( 'bloom' );

  glCatPath.render( 'postBloom', {
    dry: glCatPath.fb( 'target' ).texture
  } );

  glCatPath.render( 'post', {
    input: glCatPath.fb( 'postBloom' ).texture,
    width: width,
    height: height,
  } );

  glCatPath.render( 'fxaa', {
    target: GLCatPath.nullFb,
    input: glCatPath.fb( 'post' ).texture,
    width: width,
    height: height,
  } );

  glCatPath.end();

  init = false;
  totalFrame ++;
  originZPrev = auto( 'originZ' );

  // ------

  if ( tweak.checkbox( 'save', { value: false } ) ) {
    canvasSaver.add( totalFrame );
  }

  if ( tweak.button( 'download' ) ) {
    canvasSaver.download();
  }

  requestAnimationFrame( update );
};

require( './paths/postfx' )( glCatPath, width, height );
require( './paths/bloom' )( glCatPath, width, height );
require( './paths/particles' )( glCatPath, automaton );

update();

// ------

window.addEventListener( 'keydown', ( _e ) => {
  if ( _e.which === 27 ) {
    tweak.checkbox( 'play', { set: false } );
  }
} );
