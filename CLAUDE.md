# Claude Code Development Guidelines

## Project Overview
Modern TypeScript Express API with push notification capabilities, designed for AI-driven development and DigitalOcean deployment.

## Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express 5.1
- **Database**: MySQL (TypeORM)
- **Documentation**: OpenAPI 3.0.3 + Swagger UI
- **Deployment**: DigitalOcean (Docker/App Platform)

## Key Endpoints
- `GET /healthz` - Health check (always returns 200)
- `GET /version` - Service version info
- `GET /docs` - Swagger UI documentation
- `GET /openapi.json` - OpenAPI specification

## Development Commands
```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript
npm start        # Run production server
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
```

## Testing Endpoints
```bash
# Health check
curl http://localhost:8080/healthz

# Version info
curl http://localhost:8080/version

# API documentation
open http://localhost:8080/docs
```

## Project Structure
```
/src
  /app.ts           # Main application class
  /index.ts         # Entry point with graceful shutdown
  /config/          # Environment and database config
  /controllers/     # Route handlers
  /middlewares/     # Express middlewares (reqId, logging, error)
  /models/          # TypeORM entities
  /routes/          # API route definitions
  /services/        # Business logic
  /utils/           # Utilities (logger, etc)
/openapi/
  /openapi.json     # OpenAPI specification
/dist/              # Compiled JavaScript (generated)
```

## Environment Variables
Port defaults to 8080. Database connection is optional for development.

Key variables:
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)
- `DB_*` - Database configuration
- `JWT_SECRET` - JWT signing key

## Deployment
The project is configured for DigitalOcean deployment:

1. **Docker**: Multi-stage build with health checks
2. **GitHub Actions**: CI/CD pipeline to DigitalOcean
3. **App Platform**: Using app.yaml configuration
4. **Container Registry**: Push images to DO registry

## AI Development Workflow

### When Adding New Features
1. Check existing patterns in similar files
2. Follow TypeScript strict mode conventions
3. Add OpenAPI documentation for new endpoints
4. Create appropriate DTOs for validation
5. Implement proper error handling
6. Add logging with request IDs

### Code Style Guidelines
- Use async/await for asynchronous code
- Implement proper TypeScript types (no `any`)
- Follow REST conventions for endpoints
- Return consistent JSON response formats
- Use middleware for cross-cutting concerns

### Testing Strategy
- Unit tests for services
- Integration tests for API endpoints
- Use Postman collections for API testing
- Health checks for monitoring

### Security Best Practices
- Never commit secrets (use .env files)
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Add authentication where needed
- Use helmet for security headers

### Performance Considerations
- Use compression middleware
- Implement caching where appropriate
- Use database indexes
- Monitor with health endpoints
- Implement graceful shutdown

## Common Tasks

### Adding a New Endpoint
1. Define in OpenAPI specification
2. Create route in `/src/routes`
3. Implement controller in `/src/controllers`
4. Add business logic in `/src/services`
5. Create DTOs for validation
6. Update tests

### Database Migrations
1. Create entity in `/src/models`
2. Generate migration: `npm run typeorm migration:generate`
3. Run migration: `npm run typeorm migration:run`

### Debugging
- Check logs with proper request IDs
- Use health endpoint for liveness
- Monitor Docker logs in production
- Use Swagger UI for API testing

## Notes for Claude
- Always check existing code patterns before implementing new features
- The database connection is optional for local development
- Port 8080 is the standard for this project
- All endpoints should be documented in OpenAPI
- Follow TypeScript strict mode requirements
- Use the existing middleware pattern for new cross-cutting concerns