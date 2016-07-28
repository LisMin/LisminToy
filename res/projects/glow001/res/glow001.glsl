
uniform float iGlobalTime;
uniform vec2 iResolution;


#define MAXSTEP 90
#define time iGlobalTime
vec3 box = vec3(1.,2.,1.);
float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
}

float df_sphere(vec3 p,float d)
{
	return length(p)-d;
}

mat3 setCamera(vec3 ro,vec3 ta,float a)
{
    vec3 z = normalize(ta-ro);
    vec3 y = vec3(sin(a),cos(a),0.);
    vec3 x = normalize(cross(y,z));
    y = normalize(cross(z,x));
	return mat3(x,y,z);
}
float marchCount = 10.;
float raymarch(vec3 ro,vec3 rd,float far)
{
	float eps = 0.001;
    float t = 0.;

    vec3 p = vec3(0.);
    float d;
    marchCount = 0.;
    for(int i = 0;i < MAXSTEP;i++)
    {
    	p = ro+rd*t;
        d = sdBox(p,box);
        //d = df_sphere(p,1.);
        if(d < eps || t>far) break;

        t += d*.8;
        eps = max(t*0.001,0.001);
        marchCount += 0.2 / (d*d  + 1.0);
    }
    //marchCount = 4.;
 	return t;
}

mat3 rotate(vec3 v)
{
	return mat3(vec3(1.),vec3(1.),vec3(1.));
}

vec3 getNormal(vec3 p)
{
	float o = sdBox(p,box);
    vec2 delta = vec2(0.001,0.);
    return normalize(vec3(sdBox(p+delta.xyy,box)-o,
               	2.*delta.x,
                sdBox(p+delta.yyx,box)-o
               ));
   // return vec3(0.);
}

vec3 lig = normalize(vec3(1.,3.,-1)); // point to light
vec3 render(vec3 ro,vec3 rd)
{
    vec3 col = vec3(0.);
    float far = 100.;
    vec3 mat = vec3(0.2,0.5,0.2);

    float d = 0.;

    d = raymarch(ro,rd,far);
    vec3 p = vec3(0.);
    if(d<far)
    {
        p = ro+rd*d;
        vec3 nor = getNormal(p);
        vec3 amb = vec3(0.1,0.05,0.3);
        float dif = clamp(dot(nor,lig),0.,1.);
        float spe = clamp(dot(reflect(rd,nor),lig),0.,1.);
        spe = pow(spe,10.);

        vec3 s = 5.*dif*vec3(0.8,0.2,0.1)+1.*amb;

        col = s*mat + spe*1.;


    }
    if(d > far)
    {
    	col += vec3(0.2,0.1,0.1)*marchCount;
    }

	return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (2.*fragCoord.xy - iResolution.xy)/iResolution.y;

    float r = 10.;
    float t = time*2.;
    vec3 ro = vec3(r*sin(time),0.,r*cos(time));
    vec3 rd = vec3(uv,3.);
    vec3 ta = vec3(0.);
    rd = normalize(setCamera(ro,ta,0.)*rd);

    vec3 col = vec3(0.);

    col = render(ro,rd);


	fragColor = vec4(col,1.0);
}

void main(){
    vec4 fragColor = vec4(0.);
    vec2 fragCoord = gl_FragCoord.xy;
    mainImage(fragColor,fragCoord);
    gl_FragColor = fragColor;
}