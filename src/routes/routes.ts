/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserController } from './../controllers/UserController.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SocialController } from './../controllers/SocialController.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CourseController } from './../controllers/CourseController.js';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "SignupResponse": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"any","required":true},
            "token": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_User.Exclude_keyofUser.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"first_name":{"dataType":"string","required":true},"last_name":{"dataType":"string","required":true},"email_address":{"dataType":"string","required":true},"password":{"dataType":"string","required":true},"country":{"dataType":"string","required":true},"state":{"dataType":"string","required":true},"phone_number":{"dataType":"string","required":true},"role":{"dataType":"string","required":true},"level":{"dataType":"string","required":true},"createAt":{"dataType":"any"},"updatedAt":{"dataType":"any"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_User.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_User.Exclude_keyofUser.id__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_User_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"id":{"dataType":"string"},"first_name":{"dataType":"string"},"last_name":{"dataType":"string"},"email_address":{"dataType":"string"},"password":{"dataType":"string"},"country":{"dataType":"string"},"state":{"dataType":"string"},"phone_number":{"dataType":"string"},"role":{"dataType":"string"},"level":{"dataType":"string"},"createAt":{"dataType":"any"},"updatedAt":{"dataType":"any"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_PostDTO.Exclude_keyofPostDTO.id-or-userId__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"postId":{"dataType":"string","required":true},"title":{"dataType":"string","required":true},"content":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_PostDTO.id-or-userId_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_PostDTO.Exclude_keyofPostDTO.id-or-userId__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_ReplyDTO.Exclude_keyofReplyDTO.id-or-userId__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"postId":{"dataType":"string","required":true},"content":{"dataType":"string","required":true},"Id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_ReplyDTO.id-or-userId_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_ReplyDTO.Exclude_keyofReplyDTO.id-or-userId__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_EventDTO.Exclude_keyofEventDTO.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"event_name":{"dataType":"string"},"event_description":{"dataType":"string"},"event_time":{"dataType":"string"},"event_date":{"dataType":"string"},"event_type":{"dataType":"string"},"event_link":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_EventDTO.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_EventDTO.Exclude_keyofEventDTO.id__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CourseResponse": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"any","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Lesson": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string"},
            "lesson_title": {"dataType":"string"},
            "lesson_video": {"dataType":"string"},
            "moduleId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Module": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string"},
            "module_title": {"dataType":"string"},
            "module_description": {"dataType":"string"},
            "module_duration": {"dataType":"string"},
            "courseId": {"dataType":"string"},
            "lesson": {"dataType":"array","array":{"dataType":"refObject","ref":"Lesson"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Material": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "material_title": {"dataType":"string","required":true},
            "material_description": {"dataType":"string","required":true},
            "material_pages": {"dataType":"double","required":true},
            "material_document": {"dataType":"string","required":true},
            "courseId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateQuestionDTO": {
        "dataType": "refObject",
        "properties": {
            "question": {"dataType":"string","required":true},
            "options": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "correctAnswer": {"dataType":"string","required":true},
            "explanation": {"dataType":"string"},
            "points": {"dataType":"double"},
            "order": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateQuizDTO": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "courseId": {"dataType":"string","required":true},
            "duration": {"dataType":"double"},
            "passingScore": {"dataType":"double"},
            "maxAttempts": {"dataType":"double"},
            "questions": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateQuestionDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Objectives": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "objective_title1": {"dataType":"string","required":true},
            "objective_title2": {"dataType":"string","required":true},
            "objective_title3": {"dataType":"string","required":true},
            "objective_title4": {"dataType":"string","required":true},
            "objective_title5": {"dataType":"string","required":true},
            "courseId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_Course.Exclude_keyofCourse.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"course_title":{"dataType":"string","required":true},"course_short_description":{"dataType":"string","required":true},"course_description":{"dataType":"string","required":true},"course_level":{"dataType":"string","required":true},"course_image":{"dataType":"string","required":true},"module":{"dataType":"array","array":{"dataType":"refObject","ref":"Module"}},"material":{"dataType":"array","array":{"dataType":"refObject","ref":"Material"}},"quiz":{"dataType":"array","array":{"dataType":"refObject","ref":"CreateQuizDTO"}},"objectives":{"dataType":"array","array":{"dataType":"refObject","ref":"Objectives"}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_Course.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_Course.Exclude_keyofCourse.id__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateCourseWithRelationsDTO": {
        "dataType": "refObject",
        "properties": {
            "course_title": {"dataType":"string"},
            "course_short_description": {"dataType":"string"},
            "course_description": {"dataType":"string"},
            "course_level": {"dataType":"string"},
            "course_image": {"dataType":"string"},
            "modules": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"lessons":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"lesson_video":{"dataType":"string"},"lesson_title":{"dataType":"string"},"id":{"dataType":"string"}}}},"module_duration":{"dataType":"string"},"module_description":{"dataType":"string"},"module_title":{"dataType":"string"},"id":{"dataType":"string"}}}},
            "materials": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"material_document":{"dataType":"string"},"material_pages":{"dataType":"double"},"material_description":{"dataType":"string"},"material_title":{"dataType":"string"},"id":{"dataType":"string"}}}},
            "objectives": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"objective_title5":{"dataType":"string"},"objective_title4":{"dataType":"string"},"objective_title3":{"dataType":"string"},"objective_title2":{"dataType":"string"},"objective_title1":{"dataType":"string"},"id":{"dataType":"string"}}}},
            "quiz": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"questions":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"question_name":{"dataType":"string"},"id":{"dataType":"string"}}}},"quiz_score":{"dataType":"double"},"quiz_duration":{"dataType":"double"},"quiz_description":{"dataType":"string"},"quiz_title":{"dataType":"string"},"id":{"dataType":"string"}}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_Module.Exclude_keyofModule.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"module_title":{"dataType":"string"},"module_description":{"dataType":"string"},"module_duration":{"dataType":"string"},"courseId":{"dataType":"string"},"lesson":{"dataType":"array","array":{"dataType":"refObject","ref":"Lesson"}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_Module.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_Module.Exclude_keyofModule.id__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUserController_CreateUser: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"Omit_User.id_"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/user/signup',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.CreateUser)),

            async function UserController_CreateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_CreateUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'CreateUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_Login: Record<string, TsoaRoute.ParameterSchema> = {
                creditials: {"in":"body","name":"creditials","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"password":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/user/login',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.Login)),

            async function UserController_Login(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_Login, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'Login',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_SendOtp: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string","required":true}}},
        };
        app.post('/api/user/sendOtp',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.SendOtp)),

            async function UserController_SendOtp(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_SendOtp, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'SendOtp',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_VerifyOtp: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"sessionToken":{"dataType":"string","required":true},"otp":{"dataType":"string","required":true}}},
        };
        app.post('/api/user/verify-otp',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.VerifyOtp)),

            async function UserController_VerifyOtp(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_VerifyOtp, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'VerifyOtp',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_UploadPicture: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/user/upload-profile-picture',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.UploadPicture)),

            async function UserController_UploadPicture(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_UploadPicture, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'UploadPicture',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_UpdatePassword: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"newPassword":{"dataType":"string","required":true}}},
        };
        app.put('/api/user/update-password/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.UpdatePassword)),

            async function UserController_UpdatePassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_UpdatePassword, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'UpdatePassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_GetUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/user/get-user/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetUser)),

            async function UserController_GetUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_UpdateUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                data: {"in":"body","name":"data","required":true,"ref":"Partial_User_"},
        };
        app.put('/api/user/update-user/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.UpdateUser)),

            async function UserController_UpdateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_UpdateUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'UpdateUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_DeleteUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/user/delete-user/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.DeleteUser)),

            async function UserController_DeleteUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_DeleteUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'DeleteUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_GetStudent: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/user/fetch-users-student',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetStudent)),

            async function UserController_GetStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetStudent, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_GetTutor: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/user/fetch-users-tutors',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetTutor)),

            async function UserController_GetTutor(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetTutor, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetTutor',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_GetProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/profile',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetProfile)),

            async function UserController_GetProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetProfile, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_ForgotPassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"link":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}}},
        };
        app.post('/api/user/forgot-password',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.ForgotPassword)),

            async function UserController_ForgotPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_ForgotPassword, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'ForgotPassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_GetUserStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/user/user-student-status',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetUserStatus)),

            async function UserController_GetUserStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetUserStatus, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetUserStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_Logout: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"body","name":"req","required":true,"dataType":"any"},
        };
        app.post('/api/user/logout',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.Logout)),

            async function UserController_Logout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_Logout, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'Logout',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_CreatePost: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"Omit_PostDTO.id-or-userId_"},
        };
        app.post('/api/socials/create-post',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.CreatePost)),

            async function SocialController_CreatePost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_CreatePost, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'CreatePost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_CreateReply: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"Omit_ReplyDTO.id-or-userId_"},
        };
        app.post('/api/socials/create-reply',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.CreateReply)),

            async function SocialController_CreateReply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_CreateReply, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'CreateReply',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetPostReplies: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
        };
        app.get('/api/socials/get-post-replies/:postId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetPostReplies)),

            async function SocialController_GetPostReplies(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetPostReplies, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetPostReplies',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetPostWithReplies: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
        };
        app.get('/api/socials/get-post-with-replies/:postId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetPostWithReplies)),

            async function SocialController_GetPostWithReplies(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetPostWithReplies, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetPostWithReplies',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_LikePost: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/socials/like-post/:postId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.LikePost)),

            async function SocialController_LikePost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_LikePost, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'LikePost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_LikeReply: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/socials/like-reply/:replyId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.LikeReply)),

            async function SocialController_LikeReply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_LikeReply, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'LikeReply',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_UnlikePost: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api/socials/unlike-post/:postId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.UnlikePost)),

            async function SocialController_UnlikePost(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_UnlikePost, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'UnlikePost',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_UnlikeReply: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api/socials/unlike-reply/:replyId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.UnlikeReply)),

            async function SocialController_UnlikeReply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_UnlikeReply, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'UnlikeReply',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_CheckLike: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                postId: {"in":"query","name":"postId","dataType":"string"},
                replyId: {"in":"query","name":"replyId","dataType":"string"},
        };
        app.get('/api/socials/check-like',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.CheckLike)),

            async function SocialController_CheckLike(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_CheckLike, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'CheckLike',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetAllPosts: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/socials/get-all-posts',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetAllPosts)),

            async function SocialController_GetAllPosts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetAllPosts, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetAllPosts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_UpdateReply: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"content":{"dataType":"string","required":true}}},
        };
        app.put('/api/socials/update-reply/:replyId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.UpdateReply)),

            async function SocialController_UpdateReply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_UpdateReply, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'UpdateReply',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_DeleteReply: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api/socials/delete-reply/:replyId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.DeleteReply)),

            async function SocialController_DeleteReply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_DeleteReply, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'DeleteReply',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetPostLikes: Record<string, TsoaRoute.ParameterSchema> = {
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
        };
        app.get('/api/socials/post-likes/:postId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetPostLikes)),

            async function SocialController_GetPostLikes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetPostLikes, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetPostLikes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetReplyLikes: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
        };
        app.get('/api/socials/reply-likes/:replyId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetReplyLikes)),

            async function SocialController_GetReplyLikes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetReplyLikes, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetReplyLikes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_CreateEvent: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"Omit_EventDTO.id_"},
        };
        app.post('/api/socials/create-event',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.CreateEvent)),

            async function SocialController_CreateEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_CreateEvent, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'CreateEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetEvent: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/socials/get-event',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetEvent)),

            async function SocialController_GetEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetEvent, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_GetEventById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/socials/get-event/:id',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetEventById)),

            async function SocialController_GetEventById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetEventById, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetEventById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_UpdateEvent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"event_link":{"dataType":"string"},"event_type":{"dataType":"string"},"event_date":{"dataType":"string"},"event_time":{"dataType":"string"},"event_description":{"dataType":"string"},"event_name":{"dataType":"string"},"id":{"dataType":"string","required":true}}},
        };
        app.put('/api/socials/update-event/:id',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.UpdateEvent)),

            async function SocialController_UpdateEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_UpdateEvent, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'UpdateEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSocialController_DeleteEvent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/socials/delete-event/:id',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.DeleteEvent)),

            async function SocialController_DeleteEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_DeleteEvent, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'DeleteEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_CreateCourse: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"Omit_Course.id_"},
        };
        app.post('/api/course/create-course',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.CreateCourse)),

            async function CourseController_CreateCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_CreateCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'CreateCourse',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_GetCourse: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/get-courses',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetCourse)),

            async function CourseController_GetCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetCourse',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_GetCourseById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/course/get-courses/:id',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetCourseById)),

            async function CourseController_GetCourseById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetCourseById, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetCourseById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_UpdateCourse: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                data: {"in":"body","name":"data","required":true,"ref":"UpdateCourseWithRelationsDTO"},
        };
        app.put('/api/course/update-course/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UpdateCourse)),

            async function CourseController_UpdateCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UpdateCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UpdateCourse',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_DeleteCourse: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/course/delete-course/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.DeleteCourse)),

            async function CourseController_DeleteCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_DeleteCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'DeleteCourse',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_UploadCourseImage: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/course/upload-course-image/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UploadCourseImage)),

            async function CourseController_UploadCourseImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UploadCourseImage, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UploadCourseImage',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_UploadLessonVideo: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                moduleId: {"in":"path","name":"moduleId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"duration":{"dataType":"double"},"lessonTitle":{"dataType":"string","required":true},"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/course/upload-lesson-video/:courseId/:moduleId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UploadLessonVideo)),

            async function CourseController_UploadLessonVideo(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UploadLessonVideo, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UploadLessonVideo',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_UploadCourseMaterial: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"pages":{"dataType":"double"},"materialDescription":{"dataType":"string"},"materialTitle":{"dataType":"string","required":true},"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/course/upload-course-material/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UploadCourseMaterial)),

            async function CourseController_UploadCourseMaterial(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UploadCourseMaterial, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UploadCourseMaterial',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_GetCourseMaterials: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.get('/api/course/get-course-materials/:courseId',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetCourseMaterials)),

            async function CourseController_GetCourseMaterials(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetCourseMaterials, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetCourseMaterials',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_CreateModule: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"Omit_Module.id_"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/course/create-module',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.CreateModule)),

            async function CourseController_CreateModule(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_CreateModule, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'CreateModule',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_GetModules: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/course/get-modules',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetModules)),

            async function CourseController_GetModules(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetModules, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetModules',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_GetModuleById: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                moduleId: {"in":"path","name":"moduleId","required":true,"dataType":"string"},
        };
        app.get('/api/course/get-module/:courseId/:moduleId',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetModuleById)),

            async function CourseController_GetModuleById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetModuleById, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetModuleById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_UpdateModule: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"module_duration":{"dataType":"string"},"module_description":{"dataType":"string"},"module_title":{"dataType":"string"}}},
        };
        app.put('/api/course/update-module/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UpdateModule)),

            async function CourseController_UpdateModule(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UpdateModule, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UpdateModule',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_DeleteModule: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/course/delete-module/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.DeleteModule)),

            async function CourseController_DeleteModule(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_DeleteModule, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'DeleteModule',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourseController_CreateQuiz: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"questions":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"order":{"dataType":"double","required":true},"points":{"dataType":"double"},"explanation":{"dataType":"string"},"correctAnswer":{"dataType":"string","required":true},"options":{"dataType":"array","array":{"dataType":"string"},"required":true},"question":{"dataType":"string","required":true}}},"required":true},"maxAttempts":{"dataType":"double"},"passingScore":{"dataType":"double"},"duration":{"dataType":"double"},"courseId":{"dataType":"string","required":true},"description":{"dataType":"string"},"title":{"dataType":"string","required":true}}},
        };
        app.post('/api/course/create-quiz',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.CreateQuiz)),

            async function CourseController_CreateQuiz(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_CreateQuiz, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'CreateQuiz',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
