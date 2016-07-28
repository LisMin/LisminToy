
uniform float iGlobalTime;
uniform sampler2D iChannel0;
uniform vec4 iMouse;
uniform vec2 iResolution;

#define time iGlobalTime

#define MAXSTEP 80
#define FAR 500.
#define EPS 0.0001

vec3 lig = -normalize(vec3(30.,-10.,100.));

vec2 hash22(vec2 p)
{
    p = p*mat2(127.1,311.7,269.5,183.3);
	p = -1.0 + 2.0 * fract(sin(p)*43758.5453123);
	return sin(p*6.283 );
}

float noise(vec2 p)
{
	vec2 pi = floor(p);
    vec2 pf = p-pi;

    vec2 w = pf*pf*(3.-2.*pf);

    float f00 = dot(hash22(pi+vec2(.0,.0)),pf-vec2(.0,.0));
    float f01 = dot(hash22(pi+vec2(.0,1.)),pf-vec2(.0,1.));
    float f10 = dot(hash22(pi+vec2(1.0,0.)),pf-vec2(1.0,0.));
    float f11 = dot(hash22(pi+vec2(1.0,1.)),pf-vec2(1.0,1.));

    float xm1 = mix(f00,f10,w.x);
    float xm2 = mix(f01,f11,w.x);

    float ym = mix(xm1,xm2,w.y);
    return ym;
}

float fbm(vec3 p){

    p *= 0.02;
	float a = 2.6, r = 0., s=0.;
    for (int i=0; i<5;i++) {
      r += a*noise(p.xz); s+= a; p.xz = 1.6*p.xz; a*=.52;
    }
    r =  (r/s)*16.;

    #if 0
    r = r*pow(smoothstep(-3.,r,r),abs(r/r));
    #else
    r = 1.*pow(smoothstep(-4.,6.,r),1.8);
    #endif
    return r;
}



mat3 setCamera(vec3 ro,vec3 ta,float a)
{
	vec3 f = normalize(ta-ro);
    vec3 up = vec3(sin(a),cos(a),0);
    vec3 right = normalize(cross(up,f));
    up = normalize(cross(f,right));
    return mat3(right,up,f);
}

float terrian(vec3 p)
{
    return -10.+fbm(p);
}

float map(vec3 p)
{
    float d = FAR;
    return p.y-terrian(p);

}

float raymarch(vec3 ro,vec3 rd,float far)
{
	float t = 0.;

    float d;
    float eps = EPS;
    for(int i = 0;i < MAXSTEP;i++)
    {
        d = map(ro+rd*t);
        t += d*0.8;
        if(abs(d)<eps || t > far) break;
        #if 1
        eps = max(t*0.001,EPS);
        #else
        eps = min(t*0.001,EPS);
        #endif

    }
	return t;
}

vec3 getNormal(vec3 p)
{
	vec2 eps = vec2(0.01,0.);
    float b = map(p);
    return normalize(vec3(
        map(p+eps.xyy)-b,
        2.*eps.x,
        map(p+eps.yyx)-b
    ));
}

float linstep(in float mn, in float mx, in float x){
    return clamp((x - mn)/(mx - mn), 0., 1.);
}

//Complete hack, but looks good enough :)
vec3 scatter(vec3 ro, vec3 rd)
{
    float sd= max(dot(lig, rd)*0.5+0.5,0.);
    float dtp = -1.-(ro + rd*(FAR)).y*1.;
    float hori = (linstep(-1500., 0.0, dtp) - linstep(11., 500., dtp))*1.;
    hori *= pow(sd,.04);

    vec3 col = vec3(0);
    col += pow(hori, 200.)*vec3(.92, .93,  0.95)*.8;
    col += pow(hori, 250.)* vec3(.0, .5,  1.25)*.92;
    col += pow(hori, 7.)* vec3(.2, 0.4, 1.25)*.3;

    return col;
}

float noise1(in vec2 x){return texture2D(iChannel0, x*.001).x;}

float fbm(in vec2 p)
{
    float z=.5;
    float rz = 0.;
    for (float i= 0.;i<3.;i++ )
    {
        rz+= (sin(noise1(p)*5.)*0.5+0.5) *z;
        z *= 0.5;
        p = p*2.;
    }
    return rz;
}

float bnoise(in vec2 p){ return fbm(p*3.); }
vec3 bump(in vec3 p, in vec3 n, in float ds)
{
    vec2 e = vec2(0.005*ds,0);
    float n0 = bnoise(p.zx);
    vec3 d = vec3(bnoise(p.zx+e.xy)-n0, 1., bnoise(p.zx+e.yx)-n0)/e.x*0.025;
    d -= n*dot(n,d);
    n = normalize(n-d);
    return n;
}
//Based on: http://www.iquilezles.org/www/articles/fog/fog.htm
vec3 fog(vec3 ro, vec3 rd, vec3 col, float ds)
{
    vec3 pos = ro + rd*ds;
    float mx = (fbm(pos.zx*0.1-time*0.05)-0.5)*.02;

    const float b= 1.;
    float den = 0.3*exp(-ro.y*b)*(1.0-exp( -ds*rd.y*b ))/rd.y*0.00001;
    float sdt = max(dot(rd, lig), 0.);
    vec3  fogColor  = mix(vec3(0.95,0.92,0.915)*.2, vec3(1.1,0.96,0.945)*.3, pow(sdt,2.0)+mx*0.5);
    return mix( col, fogColor*.8, clamp(den + mx,0.,1.) );
}


vec3 render(vec3 ro,vec3 rd)
{

    vec3 col = vec3(0.);
    vec3 scat = scatter(ro,rd);
	float far = FAR;
    float d = raymarch(ro,rd,far);


    if(d < FAR)
    {
        vec3 p = ro+d*rd;
        vec3 nor = getNormal(p);
        nor = bump(p,nor,d);
        float amb = clamp( 0.5+0.5*nor.y, 0.0, 1.0 );
        float dif = clamp( dot( nor, lig ), 0.0, 1.0 );
        float bac = clamp( dot( nor, normalize(vec3(-lig.x,0.0,-lig.z))), 0.0, 1.0 );
        float spe = pow(clamp( dot( reflect(rd,nor), lig ), 0.0, 1.0 ),500.);
        float fre = pow( clamp(1.0+dot(nor,rd),0.0,1.0), 2.0 );
        vec3 brdf = 1.*amb*vec3(0.10,0.11,0.12);
        brdf += bac*vec3(0.15,0.05,0.04);
        brdf += 15.3*dif*vec3(.9,1.4,0.25);
        col = vec3(0.25,0.25,0.3);

        col = col*brdf + col*spe*.1 +.1*fre*col;

        if(p.y < -9.7)
        {
        	col = mix(col,vec3(0.91,.95,1.1),0.24);
        }

    }

    col += scat;

    col = pow( col, vec3(1.,1.0,.90) );
   col = mix(col, smoothstep(0.,1.,col), 0.2);

    return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (2.*fragCoord.xy-iResolution.xy) / iResolution.y;

    vec2 q = fragCoord.xy/iResolution.xy;

    vec3 ro = vec3(0.,30.,100.-time*7.);
    vec3 rd = vec3(uv,2.);
    vec3 ta = vec3(0.,0.,-time*7.);

    rd.y = rd.y+abs(uv.x*uv.x*0.02);
    rd = setCamera(ro,ta,0.)*normalize(rd);

    vec3 col = render(ro,rd);

   //col *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.1)*0.9+0.1;
    //col = vec3(1.);
	fragColor = vec4(col,1.0);
}

void main(){
    vec4 fragColor = vec4(0.);
    vec2 fragCoord = gl_FragCoord.xy;
    mainImage(fragColor,fragCoord);
    gl_FragColor = fragColor;
}