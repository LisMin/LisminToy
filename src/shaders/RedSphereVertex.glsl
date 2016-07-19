
uniform vec2 iResolution;
uniform float iGlobalTime;

uniform vec4 iMouse;
void main() {



    vec2 uv = (2.*gl_FragCoord.xy-iResolution.xy)/iResolution.y;



    vec3 color = vec3(sin(uv.x+iGlobalTime));
    gl_FragColor = vec4(color,1.);
}
