function wrapLon(lon) {
  return ((lon + 540) % 360) - 180;
}
function sampleEdgeFlat(ring, maxDegStep) {
  var out = [];
  for (var i = 0; i < ring.length - 2; i += 2) {
    var lon1 = ring[i],
      lat1 = ring[i + 1];
    var lon2 = ring[i + 2],
      lat2 = ring[i + 3];
    var dLon = lon2 - lon1,
      lon2n = lon2;
    if (Math.abs(dLon) > 180) {
      lon2n += dLon > 0 ? -360 : 360;
      dLon = lon2n - lon1;
    }
    var dLat = lat2 - lat1;
    var maxSpan = Math.max(Math.abs(dLon), Math.abs(dLat));
    var steps = Math.max(1, Math.ceil(maxSpan / maxDegStep));
    for (var s = 0; s <= steps; s++) {
      var t = s / steps;
      var lon = lon1 + dLon * t;
      var lat = lat1 + dLat * t;
      out.push(wrapLon(lon), lat);
    }
  }
  return new Float32Array(out);
}
function lonLatToVec3(lon, lat, r) {
  if (r === void 0) r = 1;
  var phi = ((90 - lat) * Math.PI) / 180;
  var theta = ((lon + 180) * Math.PI) / 180;
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}
onmessage = function (e) {
  var densityDeg = e.data.densityDeg,
    polysIn = e.data.polysIn;
  var edgeOut = [];
  for (var p = 0; p < polysIn.length; p++) {
    var poly = polysIn[p];
    for (var r = 0; r < poly.length; r++) {
      var sampled = sampleEdgeFlat(poly[r], Math.max(0.2, densityDeg));
      for (var i = 0; i < sampled.length; i += 2) {
        var v = lonLatToVec3(sampled[i], sampled[i + 1], 1);
        edgeOut.push(v[0], v[1], v[2]);
      }
    }
  }
  var arr = new Float32Array(edgeOut);
  postMessage({ ok: true, edge: arr }, [arr.buffer]);
};
