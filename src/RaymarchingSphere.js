/**
 * Created by Administrator on 2016/7/19.
 */
    function RaymarchingSphere(){

        var scene,camera,renderer,clock;

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);

        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth/2,window.innerHeight/2);
        document.body.appendChild(renderer.domElement);

        window.addEventListener("resize",onResize,false);

        var imageLoader = new THREE.TextureLoader();

        clock = new THREE.Clock(false);

        var tuniforms = {
            iGlobalTime:{
                type:"f",
                value:0
            },

            iResolution:{
                type:"v2",
                value:new THREE.Vector2()
            },

            iMouse: {
                type: 'v4',
                value: new THREE.Vector4()
            },

            iChannel0:{
                type:"t",
                value:imageLoader.load("res/textures/tex03.jpg")
            },

            iChannel1:{
                type:"t",
                value:imageLoader.load("res/textures/tex09.jpg")
            }
        };



        var loader = new THREE.XHRLoader();
        loader.load("res/shaders/SpaceCurvatureFragment.glsl",onload);

        function onload(response){
            var plane = new THREE.PlaneBufferGeometry(2,2);
            var mat = new THREE.ShaderMaterial({
                uniforms:tuniforms,
                vertexShader:" void main() \n {\n gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);\n}",
                fragmentShader:response
            });
            var mesh = new THREE.Mesh(plane,mat);
            // mesh.rotation.x = -Math.PI/2;
            scene.add(mesh);

            tuniforms.iResolution.value.x = window.innerWidth/2;
            tuniforms.iResolution.value.y = window.innerHeight/2;
            clock.start();
            animate();
        }

        function onResize(){
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth/2, window.innerHeight/2);
        }

        function animate(){
            requestAnimationFrame(animate);

            tuniforms.iGlobalTime.value += clock.getDelta();
            renderer.render(scene,camera);
        }

        renderer.domElement.addEventListener('mousedown', function(e) {
            var canvas = renderer.domElement;
            var rect = canvas.getBoundingClientRect();
            tuniforms.iMouse.value.x = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
            tuniforms.iMouse.value.y = (e.clientY - rect.top) / window.innerHeight * -2 + 1;
        });
        renderer.domElement.addEventListener('mouseup', function(e) {
            var canvas = renderer.domElement;
            var rect = canvas.getBoundingClientRect();
            tuniforms.iMouse.value.z = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
            tuniforms.iMouse.value.w = (e.clientY - rect.top) / window.innerHeight * -2 + 1;
        });
}