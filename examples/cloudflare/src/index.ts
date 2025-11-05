export default {
  fetch(request: Request) {
    return new Response(JSON.stringify({ message: "Hello, world!" }));
  },
};
