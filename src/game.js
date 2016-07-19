
var start = function(){
    /**
     * Created by DELL on 2016/5/31.
     */

    var scene, camera, renderer;

    var clock = new THREE.Clock();

    init();
    animate();

    function init() {

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.z = 1000;
        camera.position.y = 400;
        camera.lookAt(scene.position);

        var light = new THREE.DirectionalLight(0xffffff,10);
        light.position.set(0,2,0);
        scene.add(light);

        renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );

        var boxGeometry = new THREE.BoxGeometry(100,100,100);
        var boxMaterial = new THREE.MeshBasicMaterial({color:0xffff00});
        var box = new THREE.Mesh(boxGeometry,boxMaterial);
        scene.add(box);

        var axisHelper = new THREE.AxisHelper(500);
        scene.add(axisHelper);

        document.body.appendChild( renderer.domElement );

        window.addEventListener("resize",onWindowResize,false);
    }

    function onWindowResize(){
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth,window.innerHeight);
    }

    var time = 0;
    function animate() {

        requestAnimationFrame( animate );

        time += clock.getDelta();
        camera.position.x = 1000*Math.sin(time);
        camera.position.z = 1000*Math.cos(time);

        camera.lookAt(scene.position);
        renderer.render( scene, camera );

    }
}



