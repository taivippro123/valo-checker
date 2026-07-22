const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Valorant Store Checker API',
    version: '1.0.0',
    description: 'API documentation for the current Valorant store checker flow: auth, storefront lookup, skin listing, logging, and admin log management.'
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local development server'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Admin authentication and profile endpoints'
    },
    {
      name: 'Store',
      description: 'One-time storefront checks using Riot redirect data'
    },
    {
      name: 'Skins',
      description: 'Skin catalog endpoints'
    },
    {
      name: 'Logs',
      description: 'Log submission and admin log management'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token returned by the auth endpoints.'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            example: 'Invalid username or password'
          }
        }
      },
      UserSetupCheck: {
        type: 'object',
        properties: {
          setupRequired: {
            type: 'boolean',
            example: false
          }
        }
      },
      UserAuth: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'admin'
          },
          password: {
            type: 'string',
            example: 'password123'
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '60c72b2f9b1d8e001c888888'
          },
          username: {
            type: 'string',
            example: 'admin'
          },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        }
      },
      UserProfile: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '60c72b2f9b1d8e001c888888'
          },
          username: {
            type: 'string',
            example: 'admin'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      StoreCheckRequest: {
        type: 'object',
        required: ['redirectUrl'],
        properties: {
          redirectUrl: {
            type: 'string',
            description: 'Full Riot redirect URL copied from the browser after login. The server reads the access_token, id_token, and expires_in values from the URL fragment/query string, so the whole URL must be pasted as-is.',
            example: 'https://playvalorant.com/vi-vn/opt_in/#access_token=eyJraWQiOiJyc28tcHJvZC0yMDI0LTExIiwiYWxnIjoiUlMyNTYifQ.eyJwcCI6eyJjIjoiYXMifSwic3ViIjoiZDMxMDY2NDAtOWZiOS01MzgxLTg5NjQtNzIxYzQ1NGVmZGUyIiwic2NwIjpbImFjY291bnQiLCJvcGVuaWQiXSwiY2xtIjpbInJnbl9WTjIiLCIhUDFzbEFKQUIiXSwiYW1yIjpbInBhc3N3b3JkIl0sImlzcyI6Imh0dHBzOi8vYXV0aC5yaW90Z2FtZXMuY29tIiwiYWNyIjoidXJuOnJpb3Q6YnJvbnplIiwiZGF0Ijp7InIiOiJWTjIiLCJjIjoiYXMxIiwidSI6MzEzMjM3MDE5OTA3MDUyOCwibGlkIjoiYnJ1U1VSTVRZcUZoV3RNYVBBS0RXQSJ9LCJwbHQiOnsiZGV2IjoidW5rbm93biIsImlkIjoid2ViIn0sImV4cCI6MTc4NDYwMTMyMywiaWF0IjoxNzg0NTk3NzIzLCJqdGkiOiJZVWJybWpodEFTUSIsImNpZCI6InBsYXktdmFsb3JhbnQtd2ViLXByb2QifQ.rlz6bhYVdn7TxtfGjvWlOW5uJwmRQVUB5CDz4pD17jGsbPyY84ogJkyjIM1GciIMvMFvj3SNMoSjiROw_tCcn_L8DoGkL8DoGk-558PdSD90Bj2pgapJhZX7buCIBjdTPn5Ih6tf_cg8UA6_70O41KYwS8TG_Uq2DZGPTC3TYYKVq9dXSqVEadu-7maWHozI3z86kUPFiB2-oyjBFNL5aaOalrAVTgY1Q2b2LP96HK3SjW6dP4KcbIldgc3K3UdrIUWGZkjUv-PxNUYkz_X2Mu5Ni0UBfWVUToWvYx1gdVhJFnXDPACLUvFd9jBoAI1-dmeRSI1Ufgc6qdXBg1KgOQDzrFlw&scope=account+openid&iss=https%3A%2F%2Fauth.riotgames.com&id_token=eyJraWQiOiJyc28tcHJvZC0yMDI0LTExIiwidHlwIjoiaWRfdG9rZW4rand0IiwiYWxnIjoiUlMyNTYifQ.eyJhdF9oYXNoIjoiWndIaXhiNU1IRVgxTXpjMzBnNk9rUSIsInN1YiI6ImQzMTA2NjQwLTlmYjktNTM4MS04OTY0LTcyMWM0NTRlZmRlMiIsImNvdW50cnkiOiJ2bm0iLCJjb3VudHJ5X2F0IjoxNjYyMzY5MDk2MDAwLCJhbXIiOlsicGFzc3dvcmQiXSwiaXNzIjoiaHR0cHM6Ly9hdXRoLnJpb3RnYW1lcy5jb20iLCJsb2wiOlt7ImN1aWQiOjMxMzIzNzAxOTkwNzA1MjgsImNwaWQiOiJWTjIiLCJ1aWQiOjMxMzIzNzAxOTkwNzA1MjgsInVuYW1lIjoiU29yYU1vYmxlIiwicHRyaWQiOm51bGwsInBpZCI6IlZOMiIsInN0YXRlIjoiRU5BQkxFRCJ9XSwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjp0cnVlLCJub25jZSI6IjEiLCJhY2NvdW50X3ZlcmlmaWVkIjp0cnVlLCJhdWQiOiJwbGF5LXZhbG9yYW50LXdlYi1wcm9kIiwiYWNyIjoidXJuOnJpb3Q6YnJvbnplIiwicGxheWVyX2xvY2FsZSI6InZpIiwiZXhwIjoxNzg0Njg0MTIzLCJpYXQiOjE3ODQ1OTc3MjMsImFjY3QiOnsiZ2FtZV9uYW1lIjoiRmFuY2hvblNvcmEiLCJ0YWdfbGluZSI6IjI1MDYifSwianRpIjoienFYaWhBekd0TUkiLCJsb2dpbl9jb3VudHJ5Ijoidm5tIn0.tsqnIOFGLYWDZwAmTpoGlO8da0IGXu41UTNfRk2Ba7dkMrXLuCAmNuRSqjeBuir6Q6XsShaIn2tnwCfyFT1ytS5w0z2cc8AyaLtJ8pfSB4TLqNEVhnwtVPKr5llI9v6UHC8mY-eMzvZ0Us-sUoGMgQQWcDtcdVS_mJVKS-JboejN344PL8kJc7pzLNDSXyIPQxGlklor6Y36sWmW4__vmkYtD5Ns4svf9f1iB71PBSAUJSePncYAXD5Fl_4o1h989B41tThDEIksh4_SeOR7f_RSJinm2dKXnZJ8nQZviLIatPVSjduadlAmI94xo1cRYqwTP3ZEj6HgydN4WyO6TQ&token_type=Bearer&session_state=ffxbLVS4smKFcYkXIbNs1CJyBhxI9AZ_iP13AdVrRj0.e4PDoIWClthZuYbW9w8JIg&expires_in=3600'
          }
        }
      },
      OfferSummary: {
        type: 'object',
        properties: {
          uuid: {
            type: 'string',
            example: 'a8c1f067-45db-9c32-a5e2-6db8a2b5efc1'
          },
          displayName: {
            type: 'string',
            example: 'Kuronami Vandal'
          },
          displayIcon: {
            type: 'string',
            nullable: true,
            example: 'https://media.valorant-api.com/weaponskinlevels/...'
          }
        }
      },
      StoreCheckResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          riotId: {
            type: 'string',
            example: 'PlayerName#NA1'
          },
          shard: {
            type: 'string',
            example: 'ap'
          },
          storefront: {
            type: 'object',
            additionalProperties: true
          },
          offers: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/OfferSummary'
            }
          }
        }
      },
      SkinItem: {
        type: 'object',
        properties: {
          uuid: {
            type: 'string',
            example: '852b7c7b-4b13-cd13-b541-dfba5fb04b90'
          },
          levelUuid: {
            type: 'string',
            example: 'a8c1f067-45db-9c32-a5e2-6db8a2b5efc1'
          },
          displayName: {
            type: 'string',
            example: 'Kuronami Vandal'
          },
          displayIcon: {
            type: 'string',
            example: 'https://media.valorant-api.com/weaponskins/...'
          },
          chromas: {
            type: 'array',
            items: {
              type: 'object'
            }
          }
        }
      },
      LogInput: {
        type: 'object',
        required: ['riotId'],
        properties: {
          riotId: {
            type: 'string',
            example: 'PlayerName#NA1'
          },
          shard: {
            type: 'string',
            example: 'ap'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-17T07:05:00.000Z'
          }
        }
      },
      LogOutput: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '60c72b2f9b1d8e001c888888'
          },
          riotId: {
            type: 'string',
            example: 'PlayerName#NA1'
          },
          shard: {
            type: 'string',
            example: 'ap'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-17T07:05:00.000Z'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      AdminLogsResponse: {
        type: 'object',
        properties: {
          logs: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/LogOutput'
            }
          },
          page: {
            type: 'integer',
            example: 1
          },
          limit: {
            type: 'integer',
            example: 20
          },
          total: {
            type: 'integer',
            example: 100
          },
          pages: {
            type: 'integer',
            example: 5
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Store'],
        summary: 'Health check',
        description: 'Returns the backend health status.',
        responses: {
          200: {
            description: 'Service is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'OK'
                    },
                    message: {
                      type: 'string',
                      example: 'Valorant Store Checker API is active.'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/setup-check': {
      get: {
        tags: ['Auth'],
        summary: 'Check if setup is required',
        description: 'Returns whether the first admin user still needs to be created.',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserSetupCheck'
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register the first admin user',
        description: 'Creates the first admin user if no admin exists yet.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserAuth'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Admin created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse'
                }
              }
            }
          },
          400: {
            description: 'Setup already complete or invalid payload',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate an admin user',
        description: 'Validates local dashboard credentials and returns a JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserAuth'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse'
                }
              }
            }
          },
          401: {
            description: 'Invalid username or password',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Authenticated user profile',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserProfile'
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/store/check': {
      post: {
        tags: ['Store'],
        summary: 'Check current storefront',
        description: 'Uses the full Riot redirect URL pasted from the browser to fetch the current storefront and flatten offers for rendering. Paste the entire URL as-is, including the hash fragment with access_token and id_token values.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/StoreCheckRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Storefront lookup completed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/StoreCheckResponse'
                }
              }
            }
          },
          400: {
            description: 'Missing or invalid Riot auth data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          500: {
            description: 'Store check failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/store/test-headers': {
      post: {
        tags: ['Store'],
        summary: 'Generate required Riot API headers',
        description: 'Extracts the access token from a Riot Games redirect URL or parses the provided token directly, and returns the essential headers plus puuid and shard needed to directly request the official Valorant endpoints.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/StoreCheckRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Headers successfully generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    'X-Riot-ClientPlatform': {
                      type: 'string',
                      example: 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9'
                    },
                    'X-Riot-ClientVersion': {
                      type: 'string',
                      example: 'release-08.11-shipping-21-2550186'
                    },
                    'X-Riot-Entitlements-JWT': {
                      type: 'string',
                      example: 'eyJraWQiOiJyc28tcHJvZC1...'
                    },
                    'Authorization': {
                      type: 'string',
                      example: 'Bearer eyJhbGciOiJIUzI1Ni...'
                    },
                    'puuid': {
                      type: 'string',
                      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
                    },
                    'shard': {
                      type: 'string',
                      example: 'ap'
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Missing or invalid Riot redirect URL, access token, or unable to resolve PUUID',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          500: {
            description: 'Failed to generate headers',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/skins': {
      get: {
        tags: ['Skins'],
        summary: 'List available skins',
        description: 'Returns a list of weapon skins resolved from Valorant API with their level UUIDs.',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/SkinItem'
                  }
                }
              }
            }
          },
          500: {
            description: 'Failed to fetch skins',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/logs': {
      post: {
        tags: ['Logs'],
        summary: 'Create a new log entry',
        description: 'Stores a successful storefront lookup entry for later admin review.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LogInput'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Log created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LogOutput'
                }
              }
            }
          },
          400: {
            description: 'riotId missing',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          500: {
            description: 'Failed to create log',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/admin/logs': {
      get: {
        tags: ['Logs'],
        summary: 'List admin logs',
        description: 'Returns paginated admin logs for recent storefront checks.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            }
          },
          {
            name: 'x-admin-secret',
            in: 'header',
            required: false,
            schema: {
              type: 'string'
            },
            description: 'Optional admin secret header accepted by the server'
          }
        ],
        responses: {
          200: {
            description: 'Logs fetched successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminLogsResponse'
                }
              }
            }
          },
          401: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Logs'],
        summary: 'Clear all logs',
        description: 'Deletes all stored log entries.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'x-admin-secret',
            in: 'header',
            required: false,
            schema: {
              type: 'string'
            },
            description: 'Optional admin secret header accepted by the server'
          }
        ],
        responses: {
          200: {
            description: 'Logs cleared',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Logs cleared'
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  }
};

export default swaggerDocument;
