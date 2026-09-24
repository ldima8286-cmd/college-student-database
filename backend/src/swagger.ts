import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0' as const,
  info: {
    title: 'Student Database API',
    version: '2.0.0',
    description: 'API for managing college student database',
  },
  servers: [{ url: '/api', description: 'API server' }],
  components: {
    schemas: {
      Student: {
        type: 'object',
        required: ['id', 'fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'academicDebt', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string', minLength: 2, maxLength: 200 },
          course: { type: 'integer', minimum: 1, maximum: 6 },
          group: { type: 'string', minLength: 1, maxLength: 50 },
          specialty: { type: 'string', minLength: 1, maxLength: 200 },
          attendance: { type: 'integer', minimum: 0, maximum: 100 },
          performance: { type: 'number', minimum: 0, maximum: 5 },
          academicDebt: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      StudentStats: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          withDebt: { type: 'integer' },
          avgAttendance: { type: 'integer' },
          avgPerformance: { type: 'number' },
          byCourse: { type: 'object', additionalProperties: { type: 'integer' } },
          byCourseStats: { type: 'array', items: { type: 'object', properties: { course: { type: 'integer' }, count: { type: 'integer' }, avgPerformance: { type: 'number' }, avgAttendance: { type: 'number' } } } },
          bySpecialty: { type: 'object', additionalProperties: { type: 'integer' } },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Student' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'user'], default: 'user' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'user'] },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/status': {
      get: {
        tags: ['Auth'],
        summary: 'Get auth status',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Auth info' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/students/stats': {
      get: {
        tags: ['Students'],
        summary: 'Get student statistics',
        responses: {
          '200': { description: 'Stats', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StudentStats' } } } } } },
          '500': { description: 'Server error' },
        },
      },
    },
    '/students': {
      get: {
        tags: ['Students'],
        summary: 'List students',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'filterDebt', in: 'query', schema: { type: 'boolean' } },
          { name: 'filterCourse', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 6 } },
        ],
        responses: {
          '200': { description: 'Paginated students', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Students'],
        summary: 'Create student',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'academicDebt'],
                properties: {
                  fullName: { type: 'string' },
                  course: { type: 'integer' },
                  group: { type: 'string' },
                  specialty: { type: 'string' },
                  attendance: { type: 'integer' },
                  performance: { type: 'number' },
                  academicDebt: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Student' } } } } } },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
      delete: {
        tags: ['Students'],
        summary: 'Delete all students',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Deleted count' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/students/{id}': {
      get: {
        tags: ['Students'],
        summary: 'Get student by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Student', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Student' } } } } } },
          '404': { description: 'Not found' },
          '401': { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Students'],
        summary: 'Update student',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  course: { type: 'integer' },
                  group: { type: 'string' },
                  specialty: { type: 'string' },
                  attendance: { type: 'integer' },
                  performance: { type: 'number' },
                  academicDebt: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Student' } } } } } },
          '404': { description: 'Not found' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
      delete: {
        tags: ['Students'],
        summary: 'Delete student',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/students/{id}/toggle-debt': {
      patch: {
        tags: ['Students'],
        summary: 'Toggle academic debt',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Toggled', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Student' } } } } } },
          '404': { description: 'Not found' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get analytics',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Analytics data' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'Get audit logs',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'entity', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Audit logs' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Clear audit logs',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Audit logs cleared' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get settings',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Settings', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { semesterStart: { type: 'string' } } } } } } } },
          '401': { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update settings',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['semesterStart'],
                properties: { semesterStart: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
};

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec as any, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Student DB API',
  }));
}
