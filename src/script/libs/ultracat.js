// お前、ナンデモアリかよ！

let UltraCat = {};

UltraCat.triangleStripQuad = [ -1, -1, 1, -1, -1, 1, 1, 1 ];
UltraCat.triangleStripQuad3 = [ -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0 ];
UltraCat.triangleStripQuadUV = [ 0, 0, 1, 0, 0, 1, 1, 1 ];

UltraCat.matrix2d = ( w, h ) => {
  let arr = [];
  for ( let iy = 0; iy < h; iy ++ ) {
    for ( let ix = 0; ix < w; ix ++ ) {
      arr.push( ix, iy );
    }
  }
  return arr;
};

module.exports = UltraCat;