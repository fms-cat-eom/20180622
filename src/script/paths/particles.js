const xorshift = require( '../libs/xorshift' );
const genCube = require( '../geoms/cube.js' );
const glslify = require( 'glslify' );

xorshift( 487723 );

// ------

const particlePixels = 2;
const particlesSqrt = 64;
const particles = particlesSqrt * particlesSqrt;
// let vertsPerParticle = lunaLen / 3;

// ------

module.exports = ( glCatPath, automaton ) => {
  let glCat = glCatPath.glCat;
  let gl = glCat.gl;

  // ------

  const vboQuad = glCat.createVertexbuffer( [ -1, -1, 1, -1, -1, 1, 1, 1 ] );

  const cube = genCube( { size: 1.0 } );
  const vboCubePos = glCat.createVertexbuffer( cube.position );
  const vboCubeNor = glCat.createVertexbuffer( cube.normal );
  const iboCube = glCat.createIndexbuffer( cube.index );

  const vboParticleUV = glCat.createVertexbuffer( ( () => {
    let ret = [];
    for ( let i = 0; i < particles; i ++ ) {
      let ix = i % particlesSqrt;
      let iy = Math.floor( i / particlesSqrt );

      ret.push( ix * particlePixels );
      ret.push( iy );
    }
    return ret;
  } )() );

  // ------

  const textureRandomSize = 32;
  const textureRandomUpdate = ( _tex ) => {
    glCat.setTextureFromArray( _tex, textureRandomSize, textureRandomSize, ( () => {
      let len = textureRandomSize * textureRandomSize * 4;
      let ret = new Uint8Array( len );
      for ( let i = 0; i < len; i ++ ) {
        ret[ i ] = Math.floor( xorshift() * 256.0 );
      }
      return ret;
    } )() );
  };

  let textureRandomStatic = glCat.createTexture();
  glCat.textureWrap( textureRandomStatic, gl.REPEAT );
  textureRandomUpdate( textureRandomStatic );

  let textureRandom = glCat.createTexture();
  glCat.textureWrap( textureRandom, gl.REPEAT );

  // ------

  glCatPath.add( {
    particlesComputeReturn: {
      width: particlesSqrt * particlePixels,
      height: particlesSqrt,
      vert: glslify( '../shaders/quad.vert' ),
      frag: glslify( '../shaders/return.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );
        glCat.uniformTexture( 'sampler0', glCatPath.fb( 'particlesCompute' ).texture, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    particlesCompute: {
      width: particlesSqrt * particlePixels,
      height: particlesSqrt,
      vert: glslify( '../shaders/quad.vert' ),
      frag: glslify( '../shaders/particles-compute.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        if ( automaton.progress % 1.0 === 0.0 ) {
          xorshift( 487723 );
        }
        textureRandomUpdate( textureRandom );

        glCat.attribute( 'p', vboQuad, 2 );

        glCat.uniform1f( 'particlesSqrt', particlesSqrt );
        glCat.uniform1f( 'particlePixels', particlePixels );

        glCat.uniformTexture( 'samplerPcompute', glCatPath.fb( 'particlesComputeReturn' ).texture, 0 );
        glCat.uniformTexture( 'samplerRandom', textureRandom, 1 );

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    particlesRender: {
      vert: glslify( '../shaders/particles-render.vert' ),
      frag: glslify( '../shaders/particles-render.frag' ),
      blend: [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ],
      func: ( path, params ) => {
        glCat.attribute( 'cubePos', vboCubePos, 3 );
        glCat.attribute( 'cubeNor', vboCubeNor, 3 );
        glCat.attribute( 'computeUV', vboParticleUV, 2, 1 );

        glCat.uniform1f( 'particlesSqrt', particlesSqrt );
        glCat.uniform1f( 'particlePixels', particlePixels );

        glCat.uniform2fv( 'resolutionPcompute', [ particlesSqrt * particlePixels, particlesSqrt ] );
        glCat.uniformTexture( 'samplerPcompute', glCatPath.fb( 'particlesCompute' ).texture, 1 );

        glCat.uniform3fv( 'color', [ 0.1, 2.0, 1.0 ] );

        let ext = glCat.getExtension( 'ANGLE_instanced_arrays' );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, iboCube );
        ext.drawElementsInstancedANGLE( gl.TRIANGLES, iboCube.length, gl.UNSIGNED_SHORT, 0, particles );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
      }
    },
  } );
};