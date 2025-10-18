# Outreach Global - Sales Outreach Platform

A comprehensive sales automation and lead management platform designed to streamline multi-channel outreach campaigns with AI-powered optimization.

## 🚀 Features

- **Lead Management System** - Complete lead capture, scoring, and qualification
- **Multi-Channel Campaigns** - Email, SMS, and voice outreach automation
- **AI-Powered SDR** - AI assistant for content generation and optimization
- **Advanced Analytics** - Comprehensive reporting and ROI analysis
- **Integration Hub** - CRM, communication, and data enrichment integrations
- **Workflow Automation** - Visual workflow builder with conditional logic
- **Call Center Operations** - Inbound/outbound call management with Twilio
- **Real-time Dashboard** - Live campaign monitoring and performance tracking

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v18.0 or higher)
- **npm** or **pnpm** package manager
- **PostgreSQL** database
- **Redis** (optional, for caching and sessions)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/PushButtonPlatforms/outreachglobal.git
cd outreachglobal
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

### 3. Environment Configuration

#### API Configuration
```bash
# Copy environment template
cp apps/api/.env.example apps/api/.env

# Edit the configuration file
nano apps/api/.env
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/outreach_platform

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# External Services
SENDGRID_API_KEY=your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

#### Frontend Configuration
```bash
# Copy environment template
cp apps/front/.env.local.example apps/front/.env.local

# Edit the configuration file
nano apps/front/.env.local
```

### 4. Database Setup

```bash
# Run database migrations
cd apps/api
npm run db:migrate

# Seed database with sample data (optional)
npm run db:seed
```

## 🚀 Development

### Start Development Servers

```bash
# Start both API and frontend in development mode
npm run dev

# Or start individually:
npm run dev:api     # API server on http://localhost:4000
npm run dev:front   # Frontend on http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev          # Start both API and frontend
npm run dev:api      # Start API server only
npm run dev:front    # Start frontend only

# Building
npm run build        # Build both applications
npm run build:api    # Build API only
npm run build:front  # Build frontend only

# Production
npm run start        # Start both in production mode
npm run start:api    # Start API in production
npm run start:front  # Start frontend in production

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database

# Testing
npm run test         # Run all tests
npm run test:api     # Run API tests
npm run test:front   # Run frontend tests

# Code Quality
npm run lint         # Lint all code
npm run format       # Format code with Prettier
```

## 🏗️ Project Structure

```
outreachglobal/
├── apps/
│   ├── api/                 # NestJS Backend API
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules
│   │   │   ├── common/      # Shared utilities
│   │   │   └── database/    # Database configuration
│   │   └── scripts/         # Database scripts
│   └── front/               # Next.js Frontend
│       ├── app/             # App router pages
│       ├── components/      # React components
│       ├── lib/             # Utilities and stores
│       └── types/           # TypeScript definitions
├── packages/
│   ├── database/            # Database schemas and migrations
│   ├── ui/                  # Shared UI components
│   └── utils/               # Shared utilities
├── docs/                    # Documentation
└── README.md
```

## 🔧 Configuration

### Database Configuration

The platform uses PostgreSQL with Drizzle ORM. Supported databases:
- Local PostgreSQL
- Neon Database (recommended for production)
- Supabase
- PlanetScale
- Any PostgreSQL-compatible database

### External Service Integrations

#### Required Services:
- **SendGrid** - Email delivery service
- **Twilio** - SMS and voice communications

#### Optional Services:
- **AWS S3** - File storage
- **Clearbit** - Data enrichment
- **ZoomInfo** - Contact data
- **Hunter.io** - Email verification

### Security Configuration

1. **JWT Secrets**: Use strong, unique secrets (min. 32 characters)
2. **Database**: Use strong passwords and SSL connections
3. **CORS**: Configure allowed origins for production
4. **Rate Limiting**: Configure appropriate limits for your use case

## 📚 API Documentation

- **GraphQL Playground**: http://localhost:4000/graphql (development only)
- **API Documentation**: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- **Feature Documentation**: [docs/FEATURE_DOCUMENTATION.md](docs/FEATURE_DOCUMENTATION.md)
- **User Guide**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## 🚀 Deployment

### Environment Setup

1. **Production Database**: Set up PostgreSQL instance
2. **Environment Variables**: Configure all required variables
3. **Domain Configuration**: Set up DNS and SSL certificates

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd apps/front
vercel --prod

# Deploy API (use Vercel Functions or separate hosting)
cd apps/api
vercel --prod
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production servers
npm run start
```

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **Database Security**: Use strong passwords and SSL connections
3. **API Security**: Implement rate limiting and input validation
4. **Authentication**: Use secure JWT secrets and proper session management
5. **Data Privacy**: Implement GDPR compliance features

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:coverage
```

## 📊 Monitoring

The platform includes built-in monitoring for:
- API performance and errors
- Database query performance
- Email delivery rates
- Campaign performance metrics
- User activity tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) directory
- **Issues**: Create an issue on GitHub
- **Email**: support@outreachglobal.com

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/) and [Next.js](https://nextjs.org/)
- Database powered by [Drizzle ORM](https://orm.drizzle.team/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Made with ❤️ by the Outreach Global team**
