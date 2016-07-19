
void main() {
    gl_Position = projectMatrix*modelViewMatrix*vec4(position,1.0);
}
