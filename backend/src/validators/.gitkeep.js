// Validators layer.
// Responsibility: validate and normalize incoming request payloads before they reach
// controllers/services. On invalid input, produce a 400 error using the shared
// { "message": ... } shape.
