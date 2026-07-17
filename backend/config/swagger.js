const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Valorant Daily Store Checker & Notification System API",
    version: "1.0.0",
    description: "API Documentation for managing Riot accounts, wishlist matching, and daily storefront checks."
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token to access endpoints."
      }
    },
    schemas: {
      UserSetupCheck: {
        type: "object",
        properties: {
          setupRequired: {
            type: "boolean",
            example: false
          }
        }
      },
      UserAuth: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: {
            type: "string",
            example: "admin"
          },
          password: {
            type: "string",
            example: "password123"
          }
        }
      },
      AuthResponse: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "60c72b2f9b1d8e001c888888"
          },
          username: {
            type: "string",
            example: "admin"
          },
          token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          }
        }
      },
      RiotAccountInput: {
        type: "object",
        required: ["username", "password", "alias"],
        properties: {
          username: {
            type: "string",
            description: "Riot ID / login username (stored encrypted)",
            example: "myriotuser"
          },
          password: {
            type: "string",
            description: "Riot login password (stored encrypted)",
            example: "riotpass123"
          },
          alias: {
            type: "string",
            description: "Friendly name for this account",
            example: "Main Acc"
          },
          shard: {
            type: "string",
            description: "Region shard: ap, na, eu, kr",
            default: "ap",
            example: "ap"
          },
          ntfyTopic: {
            type: "string",
            description: "ntfy.sh subscription topic name",
            example: "val_notif_topic"
          }
        }
      },
      RiotAccountOutput: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "60c72b2f9b1d8e001c888889"
          },
          username: {
            type: "string",
            example: "myriotuser"
          },
          alias: {
            type: "string",
            example: "Main Acc"
          },
          shard: {
            type: "string",
            example: "ap"
          },
          puuid: {
            type: "string",
            example: "a8f3b7d1-e9c5-4d2a-89a1-0bf28cb39d2f"
          },
          wishlist: {
            type: "array",
            items: {
              type: "string"
            },
            example: ["a8c1f067-45db-9c32-a5e2-6db8a2b5efc1"]
          },
          ntfyTopic: {
            type: "string",
            example: "val_notif_topic"
          },
          lastChecked: {
            type: "string",
            format: "date-time",
            example: "2026-07-17T07:05:00.000Z"
          }
        }
      },
      SkinOffer: {
        type: "object",
        properties: {
          uuid: {
            type: "string",
            example: "a8c1f067-45db-9c32-a5e2-6db8a2b5efc1"
          },
          displayName: {
            type: "string",
            example: "Kuronami Vandal"
          },
          displayIcon: {
            type: "string",
            example: "https://media.valorant-api.com/weaponskinlevels/..."
          },
          streamedVideo: {
            type: "string",
            nullable: true,
            example: "https://valorant.playvalorant.com/..."
          }
        }
      },
      SkinItem: {
        type: "object",
        properties: {
          uuid: {
            type: "string",
            example: "852b7c7b-4b13-cd13-b541-dfba5fb04b90"
          },
          levelUuid: {
            type: "string",
            example: "a8c1f067-45db-9c32-a5e2-6db8a2b5efc1"
          },
          displayName: {
            type: "string",
            example: "Kuronami Vandal"
          },
          displayIcon: {
            type: "string",
            example: "https://media.valorant-api.com/weaponskins/..."
          }
        }
      }
    }
  },
  paths: {
    "/api/auth/setup-check": {
      get: {
        summary: "Check if setup is required",
        description: "Returns true if no admin users exist in the database.",
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserSetupCheck"
                }
              }
            }
          }
        }
      }
    },
    "/api/auth/register": {
      post: {
        summary: "Register the first admin user",
        description: "Creates an administrator user. This endpoint is locked once the first user is created.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserAuth"
              }
            }
          }
        },
        responses: {
          201: {
            description: "Admin user registered successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse"
                }
              }
            }
          },
          400: {
            description: "Setup already complete or registration locked"
          }
        }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Authenticate admin user",
        description: "Validates local dashboard administrator credentials and returns JWT token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserAuth"
              }
            }
          }
        },
        responses: {
          200: {
            description: "Logged in successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse"
                }
              }
            }
          },
          401: {
            description: "Invalid username or password"
          }
        }
      }
    },
    "/api/auth/me": {
      get: {
        summary: "Get current user profile",
        security: [
          {
            BearerAuth: []
          }
        ],
        responses: {
          200: {
            description: "Success"
          },
          401: {
            description: "Unauthorized"
          }
        }
      }
    },
    "/api/accounts": {
      get: {
        summary: "List all Riot Accounts",
        description: "Retrieves list of all saved accounts with masked passwords.",
        security: [
          {
            BearerAuth: []
          }
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/RiotAccountOutput"
                  }
                }
              }
            }
          },
          401: {
            description: "Unauthorized"
          }
        }
      },
      post: {
        summary: "Add new Riot Account",
        description: "Adds a Riot account, checks credentials validity against Riot servers, and retrieves their PUUID.",
        security: [
          {
            BearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RiotAccountInput"
              }
            }
          }
        },
        responses: {
          201: {
            description: "Account created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RiotAccountOutput"
                }
              }
            }
          },
          400: {
            description: "Riot authentication failed or missing fields"
          },
          401: {
            description: "Unauthorized"
          }
        }
      }
    },
    "/api/accounts/{id}": {
      put: {
        summary: "Update Riot Account",
        description: "Updates details such as alias, shard, ntfyTopic, or wishlist. Optionally checks credentials if updated username/password are passed.",
        security: [
          {
            BearerAuth: []
          }
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  alias: { type: "string" },
                  shard: { type: "string" },
                  ntfyTopic: { type: "string" },
                  wishlist: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  username: { type: "string" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Account updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RiotAccountOutput"
                }
              }
            }
          },
          404: {
            description: "Account not found"
          },
          401: {
            description: "Unauthorized"
          }
        }
      },
      delete: {
        summary: "Delete Riot Account",
        description: "Removes account settings and configuration from local database.",
        security: [
          {
            BearerAuth: []
          }
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          200: {
            description: "Deleted successfully"
          },
          404: {
            description: "Account not found"
          },
          401: {
            description: "Unauthorized"
          }
        }
      }
    },
    "/api/accounts/{id}/check": {
      post: {
        summary: "Trigger manual storefront shop check",
        description: "Authenticates with Riot, queries their store storefront API, matches skin offers against wishlist, updates lastChecked timestamp, pushes notifications if match is found, and returns active offers.",
        security: [
          {
            BearerAuth: []
          }
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          200: {
            description: "Shop check success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Storefront check completed successfully." },
                    offers: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/SkinOffer"
                      }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: "Account not found"
          },
          500: {
            description: "Riot authentication failed during check"
          }
        }
      }
    },
    "/api/skins": {
      get: {
        summary: "Get list of all weapon skins",
        description: "Downloads weapon skins list from valorant-api.com and maps them to their respective store level UUID.",
        security: [
          {
            BearerAuth: []
          }
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/SkinItem"
                  }
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
