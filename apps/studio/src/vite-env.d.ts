declare module "*.svg" {
  const url: string;
  export default url;
}
declare module "*.css?inline" {
  const css: string;
  export default css;
}
declare module "*.jpg?url" {
  const url: string;
  export default url;
}
declare module "*.webp?url" {
  const url: string;
  export default url;
}
declare module "*.woff2?url" {
  const url: string;
  export default url;
}
declare module "*.md?raw" {
  const text: string;
  export default text;
}
