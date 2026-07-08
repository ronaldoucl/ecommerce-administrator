// Services layer.
// Responsibility: business logic and the ONLY place (besides src/config/prisma) that
// talks to Prisma. Services are called by controllers and return plain data/domain
// objects. Flow: routes -> controllers -> services -> Prisma.
