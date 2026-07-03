/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { VideoTrackerController } from './../controllers/VideoTrackerController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserVerificationController } from './../controllers/UserVerificationController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserController } from './../controllers/UserController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { StudentEnrollmentController } from './../controllers/StudentEnrollmentController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SpecialController } from './../controllers/SpecialController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SocialController } from './../controllers/SocialController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PricingController } from './../controllers/PricingController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OrganizationController } from './../controllers/OrganizationController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { NotificationController } from './../controllers/NotificationController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { LevelSystem } from './../controllers/LevelSystemController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { LeaderBoardAndGamificationController } from './../controllers/LeaderBoardAndGamificationController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FeedbackController } from './../controllers/FeedbackController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { DiscussionController } from './../controllers/DiscussionController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CourseController } from './../controllers/CourseController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CertificateController } from './../controllers/CertificateController';
import { expressAuthentication } from './../auth/authentication';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';
const multer = require('multer');


const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "_36_Enums.Tracking": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["FIRST_TIME_TRACKING"]},{"dataType":"enum","enums":["SECOND_TIME_TRACKING"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_User.Exclude_keyofUser.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"any"},"first_name":{"dataType":"string","required":true},"last_name":{"dataType":"string","required":true},"email_address":{"dataType":"string","required":true},"password":{"dataType":"string","required":true},"country":{"dataType":"string","required":true},"state":{"dataType":"string","required":true},"phone_number":{"dataType":"string","required":true},"language":{"dataType":"string"},"languageCode":{"dataType":"string","required":true},"role":{"dataType":"string","required":true},"level":{"dataType":"string","required":true},"createAt":{"dataType":"any"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_User.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_User.Exclude_keyofUser.id__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.UserType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["INDIVIDUAL"]},{"dataType":"enum","enums":["ADMIN"]},{"dataType":"enum","enums":["ORGANIZATION_OWNER"]},{"dataType":"enum","enums":["INVITED_MEMBER"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.MemberPlanType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ORGANIZATION"]},{"dataType":"enum","enums":["INDIVIDUAL"]},{"dataType":"enum","enums":["INVITED_INDIVIDUAL"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.LanguageCode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["unknown"]},{"dataType":"enum","enums":["en"]},{"dataType":"enum","enums":["fr"]},{"dataType":"enum","enums":["es"]},{"dataType":"enum","enums":["pt"]},{"dataType":"enum","enums":["de"]},{"dataType":"enum","enums":["it"]},{"dataType":"enum","enums":["nl"]},{"dataType":"enum","enums":["zh_CN"]},{"dataType":"enum","enums":["zh_TW"]},{"dataType":"enum","enums":["ja"]},{"dataType":"enum","enums":["ko"]},{"dataType":"enum","enums":["hi"]},{"dataType":"enum","enums":["sw"]},{"dataType":"enum","enums":["yo"]},{"dataType":"enum","enums":["ig"]},{"dataType":"enum","enums":["ha"]},{"dataType":"enum","enums":["am"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.FormType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ORGANIZATION"]},{"dataType":"enum","enums":["INDIVIDUAL"]},{"dataType":"enum","enums":["INVITED"]},{"dataType":"enum","enums":["ADMIN"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.Levels": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["LEVEL1_SEEKER"]},{"dataType":"enum","enums":["LEVEL2_LEARNER"]},{"dataType":"enum","enums":["LEVEL3_DISCIPLE"]},{"dataType":"enum","enums":["LEVEL4_AMBASSADOR"]},{"dataType":"enum","enums":["LEVEL5_MENTOR"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.BadgesEnum": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["CADET_BADGE"]},{"dataType":"enum","enums":["COURSE_COMPLETION_BADGE"]},{"dataType":"enum","enums":["CONSISTENCY_BADGE"]},{"dataType":"enum","enums":["MASTERY_BADGE"]},{"dataType":"enum","enums":["MILESTONES_BADGES"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.OrgType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["CHURCH"]},{"dataType":"enum","enums":["SCHOOL"]},{"dataType":"enum","enums":["CLUB"]},{"dataType":"enum","enums":["OTHER"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.JoinMethod": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["CREATED"]},{"dataType":"enum","enums":["INVITE"]},{"dataType":"enum","enums":["WAITLIST"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FormattedCountry": {
        "dataType": "refObject",
        "properties": {
            "country": {"dataType":"string","required":true},
            "flag": {"dataType":"string","required":true},
            "language": {"dataType":"string","required":true},
            "nativeLanguage": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.EnrollmentStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ENROLLED"]},{"dataType":"enum","enums":["IN_PROGRESS"]},{"dataType":"enum","enums":["COMPLETED"]},{"dataType":"enum","enums":["DROPPED"]},{"dataType":"enum","enums":["NOT_ENROLLED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateWaitlistResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateWaitlistBody": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CheckWaitlistResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "exists": {"dataType":"boolean","required":true},
            "status": {"dataType":"string"},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_PostDTO.Exclude_keyofPostDTO.id-or-userId__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"title":{"dataType":"string","required":true},"content":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_PostDTO.id-or-userId_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_PostDTO.Exclude_keyofPostDTO.id-or-userId__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_ReplyDTO.Exclude_keyofReplyDTO.id-or-userId__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"content":{"dataType":"string","required":true},"parentId":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_ReplyDTO.id-or-userId_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_ReplyDTO.Exclude_keyofReplyDTO.id-or-userId__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_Group.Exclude_keyofGroup.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"group_title":{"dataType":"string","required":true},"group_short_description":{"dataType":"string","required":true},"group_description":{"dataType":"string","required":true},"group_image":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_Group.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_Group.Exclude_keyofGroup.id__","validators":{}},
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
    "_36_Enums.PlanDuration": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["FREE_PLAN"]},{"dataType":"enum","enums":["MONTHLY_PLAN"]},{"dataType":"enum","enums":["YEARLY_PLAN"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.Plans": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["FREEMIUM_USER"]},{"dataType":"enum","enums":["INVITED_STUDENT_UNLIMITED"]},{"dataType":"enum","enums":["STUDENT_PLUS"]},{"dataType":"enum","enums":["STUDENT_UNLIMITED"]},{"dataType":"enum","enums":["TUTOR_PRO"]},{"dataType":"enum","enums":["TUTOR_ELITE"]},{"dataType":"enum","enums":["CHURCH_STARTER"]},{"dataType":"enum","enums":["CHURCH_GROWTH"]},{"dataType":"enum","enums":["CHURCH_ENTERPRISE"]},{"dataType":"enum","enums":["SCHOOL_STARTER"]},{"dataType":"enum","enums":["SCHOOL_GROWTH"]},{"dataType":"enum","enums":["SCHOOL_ENTERPRISE"]},{"dataType":"enum","enums":["CLUB_STARTER"]},{"dataType":"enum","enums":["CLUB_GROWTH"]},{"dataType":"enum","enums":["CLUB_ENTERPRISE"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Plans": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.Plans","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlanDuration": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.PlanDuration","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MemberPlanType": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.MemberPlanType","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "School": {
        "dataType": "refObject",
        "properties": {
            "school_name": {"dataType":"string"},
            "school_type": {"dataType":"string"},
            "school_address": {"dataType":"string"},
            "school_admin_name": {"dataType":"string"},
            "school_role": {"dataType":"string"},
            "school_website": {"dataType":"string"},
            "school_accreditation_number": {"dataType":"string"},
            "school_document": {"dataType":"string"},
            "school_email": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Church": {
        "dataType": "refObject",
        "properties": {
            "church_ministry_name": {"dataType":"string"},
            "church_lead_pastor": {"dataType":"string"},
            "church_leadership_role": {"dataType":"string"},
            "church_email": {"dataType":"string"},
            "church_address": {"dataType":"string"},
            "church_weekly_service": {"dataType":"string"},
            "church_website": {"dataType":"string"},
            "church_logo": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Club": {
        "dataType": "refObject",
        "properties": {
            "club_name": {"dataType":"string"},
            "club_type": {"dataType":"string"},
            "club_leader_name": {"dataType":"string"},
            "club_meeting_frequency": {"dataType":"string"},
            "club_social_link": {"dataType":"string"},
            "club_parent_org": {"dataType":"string"},
            "club_description": {"dataType":"string"},
            "club_document": {"dataType":"string"},
            "club_role": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_OrganizationDTO.Exclude_keyofOrganizationDTO.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"language":{"dataType":"string","required":true},"languageCode":{"dataType":"string","required":true},"organization_name":{"dataType":"string","required":true},"organization_type":{"dataType":"string","required":true},"organization_email":{"dataType":"string"},"organization_phone_number":{"dataType":"string","required":true},"organization_country":{"dataType":"string","required":true},"organization_state":{"dataType":"string","required":true},"organization_description":{"dataType":"string","required":true},"organization_role":{"dataType":"string","required":true},"organization_year":{"dataType":"string","required":true},"school":{"ref":"School"},"user_first_name":{"dataType":"string","required":true},"user_last_name":{"dataType":"string","required":true},"user_email_address":{"dataType":"string","required":true},"user_country":{"dataType":"string","required":true},"user_state":{"dataType":"string","required":true},"user_role":{"dataType":"string","required":true},"user_phone_number":{"dataType":"string","required":true},"user_form_type":{"dataType":"string","required":true},"church":{"ref":"Church"},"club":{"ref":"Club"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_OrganizationDTO.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_OrganizationDTO.Exclude_keyofOrganizationDTO.id__","validators":{}},
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
    "Prisma.BatchPayload": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"count":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.FeedbackType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["OTHER"]},{"dataType":"enum","enums":["COURSE"]},{"dataType":"enum","enums":["GROUP"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FeedbackType": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.FeedbackType","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MediaItem": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["image"]},{"dataType":"enum","enums":["video"]}],"required":true},
            "url": {"dataType":"string","required":true},
            "filename": {"dataType":"string","required":true},
            "caption": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateDiscussionDTO": {
        "dataType": "refObject",
        "properties": {
            "content": {"dataType":"string","required":true},
            "category": {"dataType":"string","required":true},
            "isPublic": {"dataType":"boolean","required":true},
            "mediaUrls": {"dataType":"array","array":{"dataType":"refObject","ref":"MediaItem"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReplyToDiscussionDTO": {
        "dataType": "refObject",
        "properties": {
            "content": {"dataType":"string","required":true},
            "mediaUrls": {"dataType":"array","array":{"dataType":"refObject","ref":"MediaItem"}},
            "parentReplyId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NestedReplyDTO": {
        "dataType": "refObject",
        "properties": {
            "content": {"dataType":"string","required":true},
            "mediaUrls": {"dataType":"array","array":{"dataType":"refObject","ref":"MediaItem"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SendPrivateMessageDTO": {
        "dataType": "refObject",
        "properties": {
            "receiverId": {"dataType":"string","required":true},
            "content": {"dataType":"string","required":true},
            "replyToId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateLessonDTO": {
        "dataType": "refObject",
        "properties": {
            "lesson_title": {"dataType":"string","required":true},
            "lesson_video": {"dataType":"string","required":true},
            "order": {"dataType":"double"},
            "duration": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateModuleDTO": {
        "dataType": "refObject",
        "properties": {
            "module_title": {"dataType":"string","required":true},
            "module_description": {"dataType":"string","required":true},
            "module_duration": {"dataType":"string","required":true},
            "order": {"dataType":"double"},
            "lessons": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateLessonDTO"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateMaterialDTO": {
        "dataType": "refObject",
        "properties": {
            "material_title": {"dataType":"string","required":true},
            "material_description": {"dataType":"string","required":true},
            "material_pages": {"dataType":"double","required":true},
            "material_document": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateObjectivesDTO": {
        "dataType": "refObject",
        "properties": {
            "objective_title1": {"dataType":"string","required":true},
            "objective_title2": {"dataType":"string","required":true},
            "objective_title3": {"dataType":"string","required":true},
            "objective_title4": {"dataType":"string","required":true},
            "objective_title5": {"dataType":"string","required":true},
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
            "order": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateQuizDTO": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "duration": {"dataType":"double"},
            "passingScore": {"dataType":"double"},
            "maxAttempts": {"dataType":"double"},
            "questions": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateQuestionDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateCourseDTO": {
        "dataType": "refObject",
        "properties": {
            "course_title": {"dataType":"string","required":true},
            "course_short_description": {"dataType":"string","required":true},
            "course_description": {"dataType":"string","required":true},
            "course_level": {"dataType":"string","required":true},
            "course_image": {"dataType":"string","required":true},
            "module": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateModuleDTO"}},
            "material": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateMaterialDTO"}},
            "objectives": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateObjectivesDTO"}},
            "quiz": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateQuizDTO"}},
        },
        "additionalProperties": false,
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
            "modules": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"lessons":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"duration":{"dataType":"double"},"order":{"dataType":"double"},"lesson_video":{"dataType":"string"},"lesson_title":{"dataType":"string"},"id":{"dataType":"string"}}}},"order":{"dataType":"double"},"module_duration":{"dataType":"string"},"module_description":{"dataType":"string"},"module_title":{"dataType":"string"},"id":{"dataType":"string"}}}},
            "materials": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"material_document":{"dataType":"string"},"material_pages":{"dataType":"double"},"material_description":{"dataType":"string"},"material_title":{"dataType":"string"},"id":{"dataType":"string"}}}},
            "objectives": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"objective_title5":{"dataType":"string"},"objective_title4":{"dataType":"string"},"objective_title3":{"dataType":"string"},"objective_title2":{"dataType":"string"},"objective_title1":{"dataType":"string"},"id":{"dataType":"string"}}}},
            "quiz": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"questions":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"correctAnswer":{"dataType":"string"},"options":{"dataType":"array","array":{"dataType":"string"}},"question_name":{"dataType":"string"},"id":{"dataType":"string"}}}},"quiz_score":{"dataType":"double"},"quiz_duration":{"dataType":"double"},"quiz_description":{"dataType":"string"},"quiz_title":{"dataType":"string"},"id":{"dataType":"string"}}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "JsonValue": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"boolean"},{"ref":"JsonObject"},{"ref":"JsonArray"},{"dataType":"enum","enums":[null]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "JsonObject": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"ref":"JsonValue"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "JsonArray": {
        "dataType": "refObject",
        "properties": {
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Lesson": {
        "dataType": "refObject",
        "properties": {
            "lesson_title": {"dataType":"string"},
            "lesson_video": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_Module.Exclude_keyofModule.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"lesson":{"dataType":"array","array":{"dataType":"refObject","ref":"Lesson"}},"module_title":{"dataType":"string"},"module_description":{"dataType":"string"},"module_duration":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Omit_Module.id_": {
        "dataType": "refAlias",
        "type": {"ref":"Pick_Module.Exclude_keyofModule.id__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GenerateCertificateBody": {
        "dataType": "refObject",
        "properties": {
            "enrollmentId": {"dataType":"string","required":true},
            "courseId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.CertificateType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["OTHER"]},{"dataType":"enum","enums":["COURSE"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router,opts?:{multer?:ReturnType<typeof multer>}) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################

    const upload = opts?.multer ||  multer({"limits":{"fileSize":8388608}});

    
        const argsVideoTrackerController_TrackVideo: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"courseId":{"dataType":"string","required":true},"lessonId":{"dataType":"string","required":true},"videoFinished":{"dataType":"boolean","required":true},"videoTrackTime":{"dataType":"double","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/video/track-video',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController)),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController.prototype.TrackVideo)),

            async function VideoTrackerController_TrackVideo(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsVideoTrackerController_TrackVideo, request, response });

                const controller = new VideoTrackerController();

              await templateService.apiHandler({
                methodName: 'TrackVideo',
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
        const argsVideoTrackerController_UpdateTrackVideo: Record<string, TsoaRoute.ParameterSchema> = {
                videoTrackerId: {"in":"path","name":"videoTrackerId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"videoFinished":{"dataType":"boolean","required":true},"videoTrackTime":{"dataType":"double","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.put('/api/video/update-track-video/:videoTrackerId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController)),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController.prototype.UpdateTrackVideo)),

            async function VideoTrackerController_UpdateTrackVideo(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsVideoTrackerController_UpdateTrackVideo, request, response });

                const controller = new VideoTrackerController();

              await templateService.apiHandler({
                methodName: 'UpdateTrackVideo',
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
        const argsVideoTrackerController_FetchVideoTracking: Record<string, TsoaRoute.ParameterSchema> = {
                videoTrackerId: {"in":"path","name":"videoTrackerId","required":true,"dataType":"string"},
        };
        app.get('/api/video/fetch-track-video/:videoTrackerId',
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController)),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController.prototype.FetchVideoTracking)),

            async function VideoTrackerController_FetchVideoTracking(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsVideoTrackerController_FetchVideoTracking, request, response });

                const controller = new VideoTrackerController();

              await templateService.apiHandler({
                methodName: 'FetchVideoTracking',
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
        const argsVideoTrackerController_GetTrackerId: Record<string, TsoaRoute.ParameterSchema> = {
                lessonId: {"in":"path","name":"lessonId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/video/get-tracker-id/:lessonId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController)),
            ...(fetchMiddlewares<RequestHandler>(VideoTrackerController.prototype.GetTrackerId)),

            async function VideoTrackerController_GetTrackerId(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsVideoTrackerController_GetTrackerId, request, response });

                const controller = new VideoTrackerController();

              await templateService.apiHandler({
                methodName: 'GetTrackerId',
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
        const argsUserVerificationController_RefreshToken: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/verify/refresh-token',
            ...(fetchMiddlewares<RequestHandler>(UserVerificationController)),
            ...(fetchMiddlewares<RequestHandler>(UserVerificationController.prototype.RefreshToken)),

            async function UserVerificationController_RefreshToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserVerificationController_RefreshToken, request, response });

                const controller = new UserVerificationController();

              await templateService.apiHandler({
                methodName: 'RefreshToken',
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
        const argsUserController_GoogleAuth: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"idToken":{"dataType":"string","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/user/auth/google',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GoogleAuth)),

            async function UserController_GoogleAuth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GoogleAuth, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GoogleAuth',
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
                credentials: {"in":"body","name":"credentials","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"deviceId":{"dataType":"string"},"deviceType":{"dataType":"string"},"password":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}}},
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
        const argsUserController_CompleteProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"level":{"dataType":"string","required":true},"role":{"dataType":"string","required":true},"phone_number":{"dataType":"string","required":true},"state":{"dataType":"string","required":true},"country":{"dataType":"string","required":true},"password":{"dataType":"string","required":true},"last_name":{"dataType":"string","required":true},"first_name":{"dataType":"string","required":true}}},
        };
        app.post('/api/user/complete-profile',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.CompleteProfile)),

            async function UserController_CompleteProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_CompleteProfile, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'CompleteProfile',
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
        const argsUserController_CheckEmail: Record<string, TsoaRoute.ParameterSchema> = {
                email: {"in":"query","name":"email","required":true,"dataType":"string"},
        };
        app.get('/api/user/check-email',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.CheckEmail)),

            async function UserController_CheckEmail(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_CheckEmail, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'CheckEmail',
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
        const argsUserController_UpdateUserInvitation: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string","required":true},"organizationId":{"dataType":"string","required":true}}},
        };
        app.patch('/api/user/update-invitation/:userId',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.UpdateUserInvitation)),

            async function UserController_UpdateUserInvitation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_UpdateUserInvitation, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'UpdateUserInvitation',
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
        const argsUserController_GetPassword: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/get-user-password',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetPassword)),

            async function UserController_GetPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetPassword, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetPassword',
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"newPassword":{"dataType":"string","required":true}}},
        };
        app.put('/api/user/update-password',
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                data: {"in":"body","name":"data","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"languageCode":{"dataType":"string"},"language":{"dataType":"string"},"phone_number":{"dataType":"string"},"state":{"dataType":"string"},"country":{"dataType":"string"},"last_name":{"dataType":"string"},"first_name":{"dataType":"string"}}},
        };
        app.put('/api/user/update-user',
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/fetch-users-student',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/fetch-users-tutors',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"link":{"dataType":"string"},"email":{"dataType":"string","required":true}}},
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
        const argsUserController_ResetPasswordNoAuth: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"newPassword":{"dataType":"string","required":true},"token":{"dataType":"string","required":true}}},
        };
        app.post('/api/user/reset-password-no-auth',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.ResetPasswordNoAuth)),

            async function UserController_ResetPasswordNoAuth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_ResetPasswordNoAuth, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'ResetPasswordNoAuth',
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
        const argsUserController_CheckPassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"password":{"dataType":"string","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/user/check-password',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.CheckPassword)),

            async function UserController_CheckPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_CheckPassword, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'CheckPassword',
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
        const argsUserController_GetAdminDashboardStats: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/admin-dashboard-stats',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetAdminDashboardStats)),

            async function UserController_GetAdminDashboardStats(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetAdminDashboardStats, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetAdminDashboardStats',
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
        const argsUserController_GetSettings: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/settings',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetSettings)),

            async function UserController_GetSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetSettings, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetSettings',
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
        const argsUserController_UpdateDarkMode: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"darkMode":{"dataType":"boolean","required":true}}},
        };
        app.put('/api/user/settings/dark-mode',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.UpdateDarkMode)),

            async function UserController_UpdateDarkMode(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_UpdateDarkMode, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'UpdateDarkMode',
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/user/logout',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
        const argsUserController_DebugProgress: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/debug-progress',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.DebugProgress)),

            async function UserController_DebugProgress(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_DebugProgress, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'DebugProgress',
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
        const argsUserController_GetSocketToken: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/user/socket-token',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.GetSocketToken)),

            async function UserController_GetSocketToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_GetSocketToken, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'GetSocketToken',
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
        const argsUserController_RefreshToken: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/user/refresh',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.RefreshToken)),

            async function UserController_RefreshToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_RefreshToken, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'RefreshToken',
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
        const argsUserController_FetchCountries: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/user/fetch-countries',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.FetchCountries)),

            async function UserController_FetchCountries(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_FetchCountries, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'FetchCountries',
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
        const argsStudentEnrollmentController_StudentEnroll: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.post('/api/enroll/student-enroll/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController.prototype.StudentEnroll)),

            async function StudentEnrollmentController_StudentEnroll(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentEnrollmentController_StudentEnroll, request, response });

                const controller = new StudentEnrollmentController();

              await templateService.apiHandler({
                methodName: 'StudentEnroll',
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
        const argsStudentEnrollmentController_GetCoursesEnrolledByStudent: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/enroll/get-courses-enrolled-by-student',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController.prototype.GetCoursesEnrolledByStudent)),

            async function StudentEnrollmentController_GetCoursesEnrolledByStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentEnrollmentController_GetCoursesEnrolledByStudent, request, response });

                const controller = new StudentEnrollmentController();

              await templateService.apiHandler({
                methodName: 'GetCoursesEnrolledByStudent',
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
        const argsStudentEnrollmentController_ExitCourse: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/enroll/exit-course/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController.prototype.ExitCourse)),

            async function StudentEnrollmentController_ExitCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentEnrollmentController_ExitCourse, request, response });

                const controller = new StudentEnrollmentController();

              await templateService.apiHandler({
                methodName: 'ExitCourse',
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
        const argsStudentEnrollmentController_GetAllStudents: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/enroll/fetch-all-students',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController.prototype.GetAllStudents)),

            async function StudentEnrollmentController_GetAllStudents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentEnrollmentController_GetAllStudents, request, response });

                const controller = new StudentEnrollmentController();

              await templateService.apiHandler({
                methodName: 'GetAllStudents',
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
        const argsStudentEnrollmentController_GetAllStudentsById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                studentId: {"in":"path","name":"studentId","required":true,"dataType":"string"},
        };
        app.get('/api/enroll/fetch-student-details/:studentId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController.prototype.GetAllStudentsById)),

            async function StudentEnrollmentController_GetAllStudentsById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentEnrollmentController_GetAllStudentsById, request, response });

                const controller = new StudentEnrollmentController();

              await templateService.apiHandler({
                methodName: 'GetAllStudentsById',
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
        const argsStudentEnrollmentController_FetchCheckIfStudentEnrolled: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.get('/api/enroll/check-if-enrolled/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentEnrollmentController.prototype.FetchCheckIfStudentEnrolled)),

            async function StudentEnrollmentController_FetchCheckIfStudentEnrolled(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentEnrollmentController_FetchCheckIfStudentEnrolled, request, response });

                const controller = new StudentEnrollmentController();

              await templateService.apiHandler({
                methodName: 'FetchCheckIfStudentEnrolled',
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
        const argsSpecialController_CreateWaitlist: Record<string, TsoaRoute.ParameterSchema> = {
                data: {"in":"body","name":"data","required":true,"ref":"CreateWaitlistBody"},
        };
        app.post('/api/special/create-waitlist',
            ...(fetchMiddlewares<RequestHandler>(SpecialController)),
            ...(fetchMiddlewares<RequestHandler>(SpecialController.prototype.CreateWaitlist)),

            async function SpecialController_CreateWaitlist(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSpecialController_CreateWaitlist, request, response });

                const controller = new SpecialController();

              await templateService.apiHandler({
                methodName: 'CreateWaitlist',
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
        const argsSpecialController_CheckWaitlist: Record<string, TsoaRoute.ParameterSchema> = {
                email: {"in":"query","name":"email","required":true,"dataType":"string"},
        };
        app.get('/api/special/check-waitlist',
            ...(fetchMiddlewares<RequestHandler>(SpecialController)),
            ...(fetchMiddlewares<RequestHandler>(SpecialController.prototype.CheckWaitlist)),

            async function SpecialController_CheckWaitlist(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSpecialController_CheckWaitlist, request, response });

                const controller = new SpecialController();

              await templateService.apiHandler({
                methodName: 'CheckWaitlist',
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
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"Omit_PostDTO.id-or-userId_"},
        };
        app.post('/api/socials/create-post/:courseId',
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
                postId: {"in":"path","name":"postId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"Omit_ReplyDTO.id-or-userId_"},
        };
        app.post('/api/socials/create-reply/:postId',
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
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
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
                maxDepth: {"in":"query","name":"maxDepth","dataType":"double"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
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
        const argsSocialController_GetReplyThread: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                maxDepth: {"in":"query","name":"maxDepth","dataType":"double"},
        };
        app.get('/api/socials/get-reply-thread/:replyId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetReplyThread)),

            async function SocialController_GetReplyThread(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetReplyThread, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetReplyThread',
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
        const argsSocialController_GetChildReplies: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/socials/get-child-replies/:replyId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetChildReplies)),

            async function SocialController_GetChildReplies(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetChildReplies, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetChildReplies',
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
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
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
        const argsSocialController_GetPostByCourseId: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/socials/get-post-by-course/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetPostByCourseId)),

            async function SocialController_GetPostByCourseId(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetPostByCourseId, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetPostByCourseId',
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
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
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
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
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
        const argsSocialController_CreateGroup: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"Omit_Group.id_"},
        };
        app.post('/api/socials/create-group',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.CreateGroup)),

            async function SocialController_CreateGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_CreateGroup, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'CreateGroup',
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
        const argsSocialController_GetGroupByCreator: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/socials/get-groups-created-by-tutor',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetGroupByCreator)),

            async function SocialController_GetGroupByCreator(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetGroupByCreator, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetGroupByCreator',
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
        const argsSocialController_GetGroupById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/socials/get-group/:id',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetGroupById)),

            async function SocialController_GetGroupById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetGroupById, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetGroupById',
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
        const argsSocialController_GetGroup: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/socials/get-groups',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetGroup)),

            async function SocialController_GetGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetGroup, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetGroup',
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
        const argsSocialController_UpdateGroup: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"group_image":{"dataType":"string","required":true},"group_description":{"dataType":"string","required":true},"group_short_description":{"dataType":"string","required":true},"group_title":{"dataType":"string","required":true}}},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.put('/api/socials/update-group/:id',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.UpdateGroup)),

            async function SocialController_UpdateGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_UpdateGroup, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'UpdateGroup',
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
        const argsSocialController_DeleteGroup: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/socials/delete-group/:id',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.DeleteGroup)),

            async function SocialController_DeleteGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_DeleteGroup, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'DeleteGroup',
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
        const argsSocialController_UploadGroupImage: Record<string, TsoaRoute.ParameterSchema> = {
                groupId: {"in":"path","name":"groupId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/socials/upload-group-image/:groupId',
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.UploadGroupImage)),

            async function SocialController_UploadGroupImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_UploadGroupImage, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'UploadGroupImage',
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
        const argsSocialController_CheckJoined: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                groupId: {"in":"path","name":"groupId","required":true,"dataType":"string"},
        };
        app.get('/api/socials/check-joined/:groupId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.CheckJoined)),

            async function SocialController_CheckJoined(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_CheckJoined, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'CheckJoined',
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
        const argsSocialController_JoinGroup: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                groupId: {"in":"path","name":"groupId","required":true,"dataType":"string"},
        };
        app.post('/api/socials/join-group/:groupId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.JoinGroup)),

            async function SocialController_JoinGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_JoinGroup, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'JoinGroup',
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
        const argsSocialController_ExitGroup: Record<string, TsoaRoute.ParameterSchema> = {
                groupId: {"in":"path","name":"groupId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api/socials/exit-group/:groupId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.ExitGroup)),

            async function SocialController_ExitGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_ExitGroup, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'ExitGroup',
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
                groupId: {"in":"path","name":"groupId","required":true,"dataType":"string"},
        };
        app.post('/api/socials/create-event/:groupId',
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
        const argsSocialController_AttendEvent: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"dataType":"string"},
        };
        app.post('/api/socials/attend-event/:eventId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.AttendEvent)),

            async function SocialController_AttendEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_AttendEvent, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'AttendEvent',
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
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/socials/fetch-event-by-the-student-group',
            authenticateMiddleware([{"bearerAuth":[]}]),
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
        const argsSocialController_GetGroupEvent: Record<string, TsoaRoute.ParameterSchema> = {
                groupId: {"in":"path","name":"groupId","required":true,"dataType":"string"},
        };
        app.get('/api/socials/get-group-event/:groupId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SocialController)),
            ...(fetchMiddlewares<RequestHandler>(SocialController.prototype.GetGroupEvent)),

            async function SocialController_GetGroupEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSocialController_GetGroupEvent, request, response });

                const controller = new SocialController();

              await templateService.apiHandler({
                methodName: 'GetGroupEvent',
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
                body: {"in":"body","name":"body","required":true,"ref":"Omit_EventDTO.id_"},
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
        const argsPricingController_FetchPricingDetails: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/pricing/fetch-pricing-details',
            ...(fetchMiddlewares<RequestHandler>(PricingController)),
            ...(fetchMiddlewares<RequestHandler>(PricingController.prototype.FetchPricingDetails)),

            async function PricingController_FetchPricingDetails(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPricingController_FetchPricingDetails, request, response });

                const controller = new PricingController();

              await templateService.apiHandler({
                methodName: 'FetchPricingDetails',
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
        const argsPricingController_TransferCode: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/pricing/getCode',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PricingController)),
            ...(fetchMiddlewares<RequestHandler>(PricingController.prototype.TransferCode)),

            async function PricingController_TransferCode(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPricingController_TransferCode, request, response });

                const controller = new PricingController();

              await templateService.apiHandler({
                methodName: 'TransferCode',
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
        const argsPricingController_GetCode: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/pricing/fetch-code',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PricingController)),
            ...(fetchMiddlewares<RequestHandler>(PricingController.prototype.GetCode)),

            async function PricingController_GetCode(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPricingController_GetCode, request, response });

                const controller = new PricingController();

              await templateService.apiHandler({
                methodName: 'GetCode',
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
        const argsPricingController_MakeTransfer: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                data: {"in":"body","name":"data","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"type":{"ref":"MemberPlanType","required":true},"planDuration":{"ref":"PlanDuration","required":true},"plan":{"ref":"Plans","required":true},"debit_currency":{"dataType":"string"},"callback_url":{"dataType":"string"},"reference":{"dataType":"string","required":true},"narration":{"dataType":"string","required":true},"currency":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["NGN"]},{"dataType":"enum","enums":["USD"]},{"dataType":"enum","enums":["GHS"]},{"dataType":"enum","enums":["KES"]}],"required":true},"amount":{"dataType":"double","required":true},"account_number":{"dataType":"string","required":true},"account_bank":{"dataType":"string","required":true}}},
        };
        app.post('/api/pricing/make-transfer',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PricingController)),
            ...(fetchMiddlewares<RequestHandler>(PricingController.prototype.MakeTransfer)),

            async function PricingController_MakeTransfer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPricingController_MakeTransfer, request, response });

                const controller = new PricingController();

              await templateService.apiHandler({
                methodName: 'MakeTransfer',
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
        const argsPricingController_TestPlans: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/pricing/test-plans',
            ...(fetchMiddlewares<RequestHandler>(PricingController)),
            ...(fetchMiddlewares<RequestHandler>(PricingController.prototype.TestPlans)),

            async function PricingController_TestPlans(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPricingController_TestPlans, request, response });

                const controller = new PricingController();

              await templateService.apiHandler({
                methodName: 'TestPlans',
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
        const argsOrganizationController_CreateOrganization: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"Omit_OrganizationDTO.id_"},
        };
        app.post('/api/organizations/auth/create-organization',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.CreateOrganization)),

            async function OrganizationController_CreateOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_CreateOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'CreateOrganization',
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
        const argsOrganizationController_OrgLogin: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                credential: {"in":"body","name":"credential","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"org_password":{"dataType":"string","required":true},"org_email":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/auth/org/login',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.OrgLogin)),

            async function OrganizationController_OrgLogin(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_OrgLogin, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'OrgLogin',
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
        const argsOrganizationController_GetUserDetails: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/user-details/:userId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetUserDetails)),

            async function OrganizationController_GetUserDetails(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetUserDetails, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetUserDetails',
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
        const argsOrganizationController_GetOrganizationOverviewStats: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/overview-stats/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetOrganizationOverviewStats)),

            async function OrganizationController_GetOrganizationOverviewStats(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetOrganizationOverviewStats, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetOrganizationOverviewStats',
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
        const argsOrganizationController_GetOrganizationActivities: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/activities/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetOrganizationActivities)),

            async function OrganizationController_GetOrganizationActivities(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetOrganizationActivities, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetOrganizationActivities',
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
        const argsOrganizationController_GetUserBreakdown: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/user-breakdown/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetUserBreakdown)),

            async function OrganizationController_GetUserBreakdown(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetUserBreakdown, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetUserBreakdown',
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
        const argsOrganizationController_SendVerificationOTP: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
        };
        app.post('/api/organizations/auth/send-verification-otp/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.SendVerificationOTP)),

            async function OrganizationController_SendVerificationOTP(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_SendVerificationOTP, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'SendVerificationOTP',
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
        const argsOrganizationController_VerifyOrganizationOTP: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"otp":{"dataType":"string","required":true},"organizationId":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/auth/verify-organization-otp',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.VerifyOrganizationOTP)),

            async function OrganizationController_VerifyOrganizationOTP(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_VerifyOrganizationOTP, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'VerifyOrganizationOTP',
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
        const argsOrganizationController_ResendVerificationOTP: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
        };
        app.post('/api/organizations/auth/resend-verification-otp/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.ResendVerificationOTP)),

            async function OrganizationController_ResendVerificationOTP(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_ResendVerificationOTP, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'ResendVerificationOTP',
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
        const argsOrganizationController_CheckVerificationStatus: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
        };
        app.get('/api/organizations/auth/check-verification-status/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.CheckVerificationStatus)),

            async function OrganizationController_CheckVerificationStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_CheckVerificationStatus, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'CheckVerificationStatus',
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
        const argsOrganizationController_FetchOrganization: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/organizations/fetch-organizations',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.FetchOrganization)),

            async function OrganizationController_FetchOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_FetchOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'FetchOrganization',
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
        const argsOrganizationController_FetchSpecificOrganization: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/organizations/fetch-specific-organization/:id',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.FetchSpecificOrganization)),

            async function OrganizationController_FetchSpecificOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_FetchSpecificOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'FetchSpecificOrganization',
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
        const argsOrganizationController_UploadOrganizationImage: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/upload-organization-profile_picture/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.UploadOrganizationImage)),

            async function OrganizationController_UploadOrganizationImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_UploadOrganizationImage, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'UploadOrganizationImage',
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
        const argsOrganizationController_UploadChurchLogo: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/upload-church-logo/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.UploadChurchLogo)),

            async function OrganizationController_UploadChurchLogo(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_UploadChurchLogo, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'UploadChurchLogo',
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
        const argsOrganizationController_UploadSchoolLogo: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/upload-school-logo/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.UploadSchoolLogo)),

            async function OrganizationController_UploadSchoolLogo(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_UploadSchoolLogo, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'UploadSchoolLogo',
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
        const argsOrganizationController_UploadSchoolOrganizationMaterial: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/upload-school-document/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.UploadSchoolOrganizationMaterial)),

            async function OrganizationController_UploadSchoolOrganizationMaterial(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_UploadSchoolOrganizationMaterial, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'UploadSchoolOrganizationMaterial',
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
        const argsOrganizationController_UploadClubOrganizationMaterial: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/organizations/upload-club-document/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.UploadClubOrganizationMaterial)),

            async function OrganizationController_UploadClubOrganizationMaterial(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_UploadClubOrganizationMaterial, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'UploadClubOrganizationMaterial',
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
        const argsOrganizationController_UpdateOrganization: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"Omit_OrganizationDTO.id_"},
        };
        app.put('/api/organizations/update-organization/:id',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.UpdateOrganization)),

            async function OrganizationController_UpdateOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_UpdateOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'UpdateOrganization',
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
        const argsOrganizationController_OrganizationPasswordGenerator: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
        };
        app.post('/api/organizations/organization-password-generated/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.OrganizationPasswordGenerator)),

            async function OrganizationController_OrganizationPasswordGenerator(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_OrganizationPasswordGenerator, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'OrganizationPasswordGenerator',
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
        const argsOrganizationController_GetProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/profile',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetProfile)),

            async function OrganizationController_GetProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetProfile, request, response });

                const controller = new OrganizationController();

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
        const argsOrganizationController_CreateUser: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"level":{"dataType":"string","required":true},"role":{"dataType":"string","required":true},"phone_number":{"dataType":"string","required":true},"state":{"dataType":"string","required":true},"country":{"dataType":"string","required":true},"password":{"dataType":"string","required":true},"email_address":{"dataType":"string","required":true},"last_name":{"dataType":"string","required":true},"first_name":{"dataType":"string","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/organizations/invite-user/signup/:organizationId',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.CreateUser)),

            async function OrganizationController_CreateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_CreateUser, request, response });

                const controller = new OrganizationController();

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
        const argsOrganizationController_InviteUsersToOrganization: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"users":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}}},"required":true}}},
        };
        app.post('/api/organizations/invite-users-to-organization/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.InviteUsersToOrganization)),

            async function OrganizationController_InviteUsersToOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_InviteUsersToOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'InviteUsersToOrganization',
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
        const argsOrganizationController_FetchInvitedUserByToken: Record<string, TsoaRoute.ParameterSchema> = {
                token: {"in":"path","name":"token","required":true,"dataType":"string"},
        };
        app.get('/api/organizations/fetch-specific-invited-user-by-token/:token',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.FetchInvitedUserByToken)),

            async function OrganizationController_FetchInvitedUserByToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_FetchInvitedUserByToken, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'FetchInvitedUserByToken',
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
        const argsOrganizationController_GenerateNewTokenForInvitedUser: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                invitedUserId: {"in":"path","name":"invitedUserId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/organizations/generate-new-token/:organizationId/:invitedUserId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GenerateNewTokenForInvitedUser)),

            async function OrganizationController_GenerateNewTokenForInvitedUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GenerateNewTokenForInvitedUser, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GenerateNewTokenForInvitedUser',
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
        const argsOrganizationController_GetInvitedUsers: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/invited-users/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetInvitedUsers)),

            async function OrganizationController_GetInvitedUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetInvitedUsers, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetInvitedUsers',
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
        const argsOrganizationController_ResendInvitation: Record<string, TsoaRoute.ParameterSchema> = {
                invitationId: {"in":"path","name":"invitationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/organizations/resend-invitation/:invitationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.ResendInvitation)),

            async function OrganizationController_ResendInvitation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_ResendInvitation, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'ResendInvitation',
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
        const argsOrganizationController_CheckInvitation: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"token":{"dataType":"string"}}},
        };
        app.post('/api/organizations/invitations/check',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.CheckInvitation)),

            async function OrganizationController_CheckInvitation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_CheckInvitation, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'CheckInvitation',
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
        const argsOrganizationController_FetchInviteUsers: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
        };
        app.get('/api/organizations/fetch-invited-users/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.FetchInviteUsers)),

            async function OrganizationController_FetchInviteUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_FetchInviteUsers, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'FetchInviteUsers',
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
        const argsOrganizationController_FetchInvitedUsersWithAccess: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/fetch-invited-users-with-access/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.FetchInvitedUsersWithAccess)),

            async function OrganizationController_FetchInvitedUsersWithAccess(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_FetchInvitedUsersWithAccess, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'FetchInvitedUsersWithAccess',
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
        const argsOrganizationController_FetchInvitedUsersEnhanced: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/fetch-invited-users-enhanced/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.FetchInvitedUsersEnhanced)),

            async function OrganizationController_FetchInvitedUsersEnhanced(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_FetchInvitedUsersEnhanced, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'FetchInvitedUsersEnhanced',
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
        const argsOrganizationController_DeleteOrganization: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/organizations/delete-organization/:id',
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.DeleteOrganization)),

            async function OrganizationController_DeleteOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_DeleteOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'DeleteOrganization',
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
        const argsOrganizationController_GetCoursesByOrganization: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/get-courses-by-organization',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetCoursesByOrganization)),

            async function OrganizationController_GetCoursesByOrganization(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetCoursesByOrganization, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetCoursesByOrganization',
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
        const argsOrganizationController_GetOrganizationCoursesWithStats: Record<string, TsoaRoute.ParameterSchema> = {
                organizationId: {"in":"path","name":"organizationId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/organizations/courses-with-stats/:organizationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.GetOrganizationCoursesWithStats)),

            async function OrganizationController_GetOrganizationCoursesWithStats(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_GetOrganizationCoursesWithStats, request, response });

                const controller = new OrganizationController();

              await templateService.apiHandler({
                methodName: 'GetOrganizationCoursesWithStats',
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
        const argsOrganizationController_Logout: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/organizations/logout',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController)),
            ...(fetchMiddlewares<RequestHandler>(OrganizationController.prototype.Logout)),

            async function OrganizationController_Logout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrganizationController_Logout, request, response });

                const controller = new OrganizationController();

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
        const argsNotificationController_getMyNotifications: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/notifications/fetch-all-notification',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getMyNotifications)),

            async function NotificationController_getMyNotifications(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getMyNotifications, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'getMyNotifications',
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
        const argsNotificationController_getUnreadNotifications: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/notifications/unread',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getUnreadNotifications)),

            async function NotificationController_getUnreadNotifications(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getUnreadNotifications, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'getUnreadNotifications',
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
        const argsNotificationController_getNotificationCounts: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/notifications/counts',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getNotificationCounts)),

            async function NotificationController_getNotificationCounts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getNotificationCounts, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'getNotificationCounts',
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
        const argsNotificationController_markNotificationAsRead: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                notificationId: {"in":"path","name":"notificationId","required":true,"dataType":"string"},
        };
        app.put('/api/notifications/:notificationId/read',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.markNotificationAsRead)),

            async function NotificationController_markNotificationAsRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_markNotificationAsRead, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'markNotificationAsRead',
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
        const argsNotificationController_markAllAsRead: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.put('/api/notifications/read-all',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.markAllAsRead)),

            async function NotificationController_markAllAsRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_markAllAsRead, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'markAllAsRead',
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
        const argsNotificationController_deleteNotification: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                notificationId: {"in":"path","name":"notificationId","required":true,"dataType":"string"},
        };
        app.delete('/api/notifications/:notificationId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.deleteNotification)),

            async function NotificationController_deleteNotification(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_deleteNotification, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'deleteNotification',
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
        const argsNotificationController_getUserNotifications: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/notifications/user',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getUserNotifications)),

            async function NotificationController_getUserNotifications(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getUserNotifications, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'getUserNotifications',
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
        const argsNotificationController_getUnreadCount: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/notifications/unread-count',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getUnreadCount)),

            async function NotificationController_getUnreadCount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getUnreadCount, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'getUnreadCount',
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
        const argsNotificationController_archiveNotification: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                notificationId: {"in":"path","name":"notificationId","required":true,"dataType":"string"},
        };
        app.put('/api/notifications/:notificationId/archive',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.archiveNotification)),

            async function NotificationController_archiveNotification(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_archiveNotification, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'archiveNotification',
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
        const argsNotificationController_clearAllNotifications: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/api/notifications/clear-all',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.clearAllNotifications)),

            async function NotificationController_clearAllNotifications(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_clearAllNotifications, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'clearAllNotifications',
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
        const argsNotificationController_ChangeNotificationsSettings: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"darkMode":{"dataType":"boolean","required":true},"email_notification":{"dataType":"boolean","required":true},"group_activity":{"dataType":"boolean","required":true},"daily_reminders":{"dataType":"boolean","required":true},"achievement":{"dataType":"boolean","required":true},"event":{"dataType":"boolean","required":true},"course_updates":{"dataType":"boolean","required":true},"enable_push_notification":{"dataType":"boolean","required":true},"organizationId":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"userId":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                settingsId: {"in":"path","name":"settingsId","required":true,"dataType":"string"},
        };
        app.put('/api/notifications/change-notification-settings/:settingsId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.ChangeNotificationsSettings)),

            async function NotificationController_ChangeNotificationsSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_ChangeNotificationsSettings, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'ChangeNotificationsSettings',
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
        const argsNotificationController_MakeSystemAnnouncement: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/api/notifications/make-system-announcement',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.MakeSystemAnnouncement)),

            async function NotificationController_MakeSystemAnnouncement(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_MakeSystemAnnouncement, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'MakeSystemAnnouncement',
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
        const argsNotificationController_FetchAnnouncementByAdmin: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/notifications/fetch-annocucment-by-admin',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.FetchAnnouncementByAdmin)),

            async function NotificationController_FetchAnnouncementByAdmin(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_FetchAnnouncementByAdmin, request, response });

                const controller = new NotificationController();

              await templateService.apiHandler({
                methodName: 'FetchAnnouncementByAdmin',
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
        const argsLevelSystem_StartJourney: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/growth/start-journey',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem)),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem.prototype.StartJourney)),

            async function LevelSystem_StartJourney(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLevelSystem_StartJourney, request, response });

                const controller = new LevelSystem();

              await templateService.apiHandler({
                methodName: 'StartJourney',
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
        const argsLevelSystem_CheckJourneyStatus: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/growth/check-journey-status',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem)),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem.prototype.CheckJourneyStatus)),

            async function LevelSystem_CheckJourneyStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLevelSystem_CheckJourneyStatus, request, response });

                const controller = new LevelSystem();

              await templateService.apiHandler({
                methodName: 'CheckJourneyStatus',
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
        const argsLevelSystem_FetchAchievement: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/growth/fetch-achievement',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem)),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem.prototype.FetchAchievement)),

            async function LevelSystem_FetchAchievement(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLevelSystem_FetchAchievement, request, response });

                const controller = new LevelSystem();

              await templateService.apiHandler({
                methodName: 'FetchAchievement',
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
        const argsLevelSystem_FetchGrowth: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/growth/fetch-growth-user',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem)),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem.prototype.FetchGrowth)),

            async function LevelSystem_FetchGrowth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLevelSystem_FetchGrowth, request, response });

                const controller = new LevelSystem();

              await templateService.apiHandler({
                methodName: 'FetchGrowth',
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
        const argsLevelSystem_GetLeaderboard: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                type: {"in":"query","name":"type","dataType":"string"},
                id: {"in":"query","name":"id","dataType":"string"},
                limit: {"default":10,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/growth/leaderboard',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem)),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem.prototype.GetLeaderboard)),

            async function LevelSystem_GetLeaderboard(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLevelSystem_GetLeaderboard, request, response });

                const controller = new LevelSystem();

              await templateService.apiHandler({
                methodName: 'GetLeaderboard',
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
        const argsLevelSystem_GetUserSummary: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/growth/user-summary',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem)),
            ...(fetchMiddlewares<RequestHandler>(LevelSystem.prototype.GetUserSummary)),

            async function LevelSystem_GetUserSummary(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLevelSystem_GetUserSummary, request, response });

                const controller = new LevelSystem();

              await templateService.apiHandler({
                methodName: 'GetUserSummary',
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
        const argsLeaderBoardAndGamificationController_GetDashboard: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/gamification/dashboard',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetDashboard)),

            async function LeaderBoardAndGamificationController_GetDashboard(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetDashboard, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetDashboard',
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
        const argsLeaderBoardAndGamificationController_GetCurrentLevel: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/gamification/level',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetCurrentLevel)),

            async function LeaderBoardAndGamificationController_GetCurrentLevel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetCurrentLevel, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetCurrentLevel',
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
        const argsLeaderBoardAndGamificationController_GetLeaderboard: Record<string, TsoaRoute.ParameterSchema> = {
                type: {"in":"query","name":"type","dataType":"union","subSchemas":[{"dataType":"enum","enums":["global"]},{"dataType":"enum","enums":["course"]},{"dataType":"enum","enums":["group"]}]},
                id: {"in":"query","name":"id","dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/gamification/leaderboard',
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetLeaderboard)),

            async function LeaderBoardAndGamificationController_GetLeaderboard(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetLeaderboard, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetLeaderboard',
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
        const argsLeaderBoardAndGamificationController_GetMyRank: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                type: {"in":"query","name":"type","dataType":"union","subSchemas":[{"dataType":"enum","enums":["global"]},{"dataType":"enum","enums":["course"]}]},
                id: {"in":"query","name":"id","dataType":"string"},
        };
        app.get('/api/gamification/my-rank',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetMyRank)),

            async function LeaderBoardAndGamificationController_GetMyRank(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetMyRank, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetMyRank',
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
        const argsLeaderBoardAndGamificationController_GetAllBadges: Record<string, TsoaRoute.ParameterSchema> = {
                earned: {"in":"query","name":"earned","dataType":"boolean"},
        };
        app.get('/api/gamification/badges',
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetAllBadges)),

            async function LeaderBoardAndGamificationController_GetAllBadges(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetAllBadges, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetAllBadges',
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
        const argsLeaderBoardAndGamificationController_GetMyBadges: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/gamification/my-badges',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetMyBadges)),

            async function LeaderBoardAndGamificationController_GetMyBadges(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetMyBadges, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetMyBadges',
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
        const argsLeaderBoardAndGamificationController_GetPointHistory: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                offset: {"default":0,"in":"query","name":"offset","dataType":"double"},
        };
        app.get('/api/gamification/point-history',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetPointHistory)),

            async function LeaderBoardAndGamificationController_GetPointHistory(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetPointHistory, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetPointHistory',
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
        const argsLeaderBoardAndGamificationController_GetOrganizationLeaderboard: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                limit: {"default":10,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/gamification/organization-leaderboard',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetOrganizationLeaderboard)),

            async function LeaderBoardAndGamificationController_GetOrganizationLeaderboard(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetOrganizationLeaderboard, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetOrganizationLeaderboard',
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
        const argsLeaderBoardAndGamificationController_GetXPBreakdown: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/gamification/xp-breakdown',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetXPBreakdown)),

            async function LeaderBoardAndGamificationController_GetXPBreakdown(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetXPBreakdown, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetXPBreakdown',
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
        const argsLeaderBoardAndGamificationController_GetAllLevels: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/gamification/levels',
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController)),
            ...(fetchMiddlewares<RequestHandler>(LeaderBoardAndGamificationController.prototype.GetAllLevels)),

            async function LeaderBoardAndGamificationController_GetAllLevels(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLeaderBoardAndGamificationController_GetAllLevels, request, response });

                const controller = new LeaderBoardAndGamificationController();

              await templateService.apiHandler({
                methodName: 'GetAllLevels',
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
        const argsFeedbackController_Feedback: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"type":{"ref":"FeedbackType","required":true},"message":{"dataType":"string","required":true}}},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/feedback/feedback',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FeedbackController)),
            ...(fetchMiddlewares<RequestHandler>(FeedbackController.prototype.Feedback)),

            async function FeedbackController_Feedback(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeedbackController_Feedback, request, response });

                const controller = new FeedbackController();

              await templateService.apiHandler({
                methodName: 'Feedback',
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
        const argsFeedbackController_FetchFeedback: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/feedback/fetch-feedbacks',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FeedbackController)),
            ...(fetchMiddlewares<RequestHandler>(FeedbackController.prototype.FetchFeedback)),

            async function FeedbackController_FetchFeedback(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeedbackController_FetchFeedback, request, response });

                const controller = new FeedbackController();

              await templateService.apiHandler({
                methodName: 'FetchFeedback',
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
        const argsDiscussionController_UploadPublicImage: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/discussion/upload/image',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.UploadPublicImage)),

            async function DiscussionController_UploadPublicImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_UploadPublicImage, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'UploadPublicImage',
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
        const argsDiscussionController_UploadPublicVideo: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mimeType":{"dataType":"string","required":true},"fileName":{"dataType":"string","required":true},"file":{"dataType":"string","required":true}}},
        };
        app.post('/api/discussion/upload/video',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.UploadPublicVideo)),

            async function DiscussionController_UploadPublicVideo(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_UploadPublicVideo, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'UploadPublicVideo',
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
        const argsDiscussionController_CreatePublicDiscussion: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateDiscussionDTO"},
        };
        app.post('/api/discussion/public',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.CreatePublicDiscussion)),

            async function DiscussionController_CreatePublicDiscussion(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_CreatePublicDiscussion, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'CreatePublicDiscussion',
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
        const argsDiscussionController_GetPublicDiscussions: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                sort: {"default":"latest","in":"query","name":"sort","dataType":"union","subSchemas":[{"dataType":"enum","enums":["latest"]},{"dataType":"enum","enums":["popular"]}]},
        };
        app.get('/api/discussion/public',
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetPublicDiscussions)),

            async function DiscussionController_GetPublicDiscussions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetPublicDiscussions, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetPublicDiscussions',
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
        const argsDiscussionController_GetDiscussionById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                discussionId: {"in":"path","name":"discussionId","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/discussion/public/:discussionId',
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetDiscussionById)),

            async function DiscussionController_GetDiscussionById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetDiscussionById, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetDiscussionById',
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
        const argsDiscussionController_ReplyToDiscussion: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                discussionId: {"in":"path","name":"discussionId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ReplyToDiscussionDTO"},
        };
        app.post('/api/discussion/public/:discussionId/reply',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.ReplyToDiscussion)),

            async function DiscussionController_ReplyToDiscussion(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_ReplyToDiscussion, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'ReplyToDiscussion',
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
        const argsDiscussionController_ReplyToReply: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"NestedReplyDTO"},
        };
        app.post('/api/discussion/reply/:replyId/nested',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.ReplyToReply)),

            async function DiscussionController_ReplyToReply(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_ReplyToReply, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'ReplyToReply',
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
        const argsDiscussionController_GetReplyWithNested: Record<string, TsoaRoute.ParameterSchema> = {
                replyId: {"in":"path","name":"replyId","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/discussion/reply/:replyId',
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetReplyWithNested)),

            async function DiscussionController_GetReplyWithNested(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetReplyWithNested, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetReplyWithNested',
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
        const argsDiscussionController_ToggleLike: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                discussionId: {"in":"path","name":"discussionId","required":true,"dataType":"string"},
        };
        app.post('/api/discussion/:discussionId/like',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.ToggleLike)),

            async function DiscussionController_ToggleLike(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_ToggleLike, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'ToggleLike',
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
        const argsDiscussionController_UpdateDiscussion: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                discussionId: {"in":"path","name":"discussionId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"mediaUrls":{"dataType":"array","array":{"dataType":"refObject","ref":"MediaItem"}},"category":{"dataType":"string","required":true},"content":{"dataType":"string","required":true}}},
        };
        app.put('/api/discussion/:discussionId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.UpdateDiscussion)),

            async function DiscussionController_UpdateDiscussion(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_UpdateDiscussion, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'UpdateDiscussion',
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
        const argsDiscussionController_DeleteDiscussion: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                discussionId: {"in":"path","name":"discussionId","required":true,"dataType":"string"},
        };
        app.delete('/api/discussion/:discussionId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.DeleteDiscussion)),

            async function DiscussionController_DeleteDiscussion(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_DeleteDiscussion, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'DeleteDiscussion',
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
        const argsDiscussionController_GetUserById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
        };
        app.get('/api/discussion/profile/:userId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetUserById)),

            async function DiscussionController_GetUserById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetUserById, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetUserById',
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
        const argsDiscussionController_SendPrivateMessage: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"SendPrivateMessageDTO"},
        };
        app.post('/api/discussion/private',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.SendPrivateMessage)),

            async function DiscussionController_SendPrivateMessage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_SendPrivateMessage, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'SendPrivateMessage',
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
        const argsDiscussionController_GetPrivateConversations: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/discussion/private/conversations',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetPrivateConversations)),

            async function DiscussionController_GetPrivateConversations(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetPrivateConversations, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetPrivateConversations',
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
        const argsDiscussionController_MarkMessagesAsRead: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
        };
        app.post('/api/discussion/private-messages/mark-read/:userId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.MarkMessagesAsRead)),

            async function DiscussionController_MarkMessagesAsRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_MarkMessagesAsRead, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'MarkMessagesAsRead',
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
        const argsDiscussionController_GetDiscussionComments: Record<string, TsoaRoute.ParameterSchema> = {
                discussionId: {"in":"path","name":"discussionId","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/discussion/public/:discussionId/comments',
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetDiscussionComments)),

            async function DiscussionController_GetDiscussionComments(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetDiscussionComments, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetDiscussionComments',
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
        const argsDiscussionController_GetPrivateMessages: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/discussion/private/:userId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetPrivateMessages)),

            async function DiscussionController_GetPrivateMessages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetPrivateMessages, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetPrivateMessages',
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
        const argsDiscussionController_GetUnreadCount: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/discussion/private/unread/count',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetUnreadCount)),

            async function DiscussionController_GetUnreadCount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetUnreadCount, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetUnreadCount',
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
        const argsDiscussionController_GetAvailableTutors: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/discussion/tutors',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetAvailableTutors)),

            async function DiscussionController_GetAvailableTutors(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetAvailableTutors, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetAvailableTutors',
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
        const argsDiscussionController_SearchTutors: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"query","name":"query","required":true,"dataType":"string"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/discussion/tutors/search',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.SearchTutors)),

            async function DiscussionController_SearchTutors(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_SearchTutors, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'SearchTutors',
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
        const argsDiscussionController_GetTutorConversation: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                tutorId: {"in":"path","name":"tutorId","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":50,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/discussion/tutors/:tutorId/conversation',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetTutorConversation)),

            async function DiscussionController_GetTutorConversation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetTutorConversation, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetTutorConversation',
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
        const argsDiscussionController_GetAvailableStudents: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/discussion/students',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.GetAvailableStudents)),

            async function DiscussionController_GetAvailableStudents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_GetAvailableStudents, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'GetAvailableStudents',
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
        const argsDiscussionController_UpdatePrivateMessage: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                messageId: {"in":"path","name":"messageId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"content":{"dataType":"string","required":true}}},
        };
        app.put('/api/discussion/private/message/:messageId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.UpdatePrivateMessage)),

            async function DiscussionController_UpdatePrivateMessage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_UpdatePrivateMessage, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'UpdatePrivateMessage',
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
        const argsDiscussionController_DeletePrivateMessage: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                messageId: {"in":"path","name":"messageId","required":true,"dataType":"string"},
                deleteType: {"default":"everyone","in":"query","name":"deleteType","dataType":"union","subSchemas":[{"dataType":"enum","enums":["me"]},{"dataType":"enum","enums":["everyone"]}]},
        };
        app.delete('/api/discussion/private/message/:messageId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.DeletePrivateMessage)),

            async function DiscussionController_DeletePrivateMessage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_DeletePrivateMessage, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'DeletePrivateMessage',
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
        const argsDiscussionController_ClearPrivateMessages: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
        };
        app.delete('/api/discussion/private/clear/:userId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController)),
            ...(fetchMiddlewares<RequestHandler>(DiscussionController.prototype.ClearPrivateMessages)),

            async function DiscussionController_ClearPrivateMessages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDiscussionController_ClearPrivateMessages, request, response });

                const controller = new DiscussionController();

              await templateService.apiHandler({
                methodName: 'ClearPrivateMessages',
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
                body: {"in":"body","name":"body","required":true,"ref":"CreateCourseDTO"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
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
        const argsCourseController_UpdateCourse: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateCourseWithRelationsDTO"},
        };
        app.put('/api/course/update-course/:courseId',
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
        const argsCourseController_GetAllCourses: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/course/get-all-courses',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetAllCourses)),

            async function CourseController_GetAllCourses(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetAllCourses, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetAllCourses',
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
        const argsCourseController_GetAllCoursesByLevel: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/get-all-courses-level',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetAllCoursesByLevel)),

            async function CourseController_GetAllCoursesByLevel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetAllCoursesByLevel, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetAllCoursesByLevel',
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
        const argsCourseController_GetUserCourse: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/get-courses-by-tutor',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetUserCourse)),

            async function CourseController_GetUserCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetUserCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetUserCourse',
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
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.get('/api/course/get-course/:courseId',
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
        const argsCourseController_FetchQuizzes: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.get('/api/course/fetch-quizzes/:courseId',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.FetchQuizzes)),

            async function CourseController_FetchQuizzes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_FetchQuizzes, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'FetchQuizzes',
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
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.delete('/api/course/delete-course/:courseId',
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
                file: {"in":"formData","name":"file","required":true,"dataType":"file"},
        };
        app.post('/api/course/upload-lesson-video/:courseId/:moduleId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            upload.fields([
                {
                    name: "file",
                    maxCount: 1
                }
            ]),
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
        const argsCourseController_UpdateLesson: Record<string, TsoaRoute.ParameterSchema> = {
                lessonId: {"in":"path","name":"lessonId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"duration":{"dataType":"double"},"lesson_title":{"dataType":"string"},"lesson_video":{"dataType":"string","required":true}}},
        };
        app.put('/api/course/update-lesson/:lessonId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UpdateLesson)),

            async function CourseController_UpdateLesson(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UpdateLesson, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UpdateLesson',
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
                materialId: {"in":"path","name":"materialId","required":true,"dataType":"string"},
                file: {"in":"formData","name":"file","required":true,"dataType":"file"},
        };
        app.post('/api/course/upload-course-material/:courseId/:materialId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            upload.fields([
                {
                    name: "file",
                    maxCount: 1
                }
            ]),
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
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.post('/api/course/create-module/:courseId',
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
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"questions":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"order":{"dataType":"double","required":true},"points":{"dataType":"double"},"explanation":{"dataType":"string"},"correctAnswer":{"dataType":"string","required":true},"options":{"dataType":"array","array":{"dataType":"string"},"required":true},"question":{"dataType":"string","required":true}}},"required":true},"maxAttempts":{"dataType":"double"},"passingScore":{"dataType":"double"},"duration":{"dataType":"double"},"courseId":{"dataType":"string","required":true},"description":{"dataType":"string"},"title":{"dataType":"string","required":true}}},
        };
        app.post('/api/course/create-quiz/:courseId',
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
        const argsCourseController_SaveCourse: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.post('/api/course/save-course/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.SaveCourse)),

            async function CourseController_SaveCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_SaveCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'SaveCourse',
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
        const argsCourseController_UnSaveCourse: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.delete('/api/course/unsave-course/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.UnSaveCourse)),

            async function CourseController_UnSaveCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_UnSaveCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'UnSaveCourse',
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
        const argsCourseController_CheckedSaveCourse: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.get('/api/course/check-saved-course/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.CheckedSaveCourse)),

            async function CourseController_CheckedSaveCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_CheckedSaveCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'CheckedSaveCourse',
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
        const argsCourseController_SubmitQuiz: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                quizId: {"in":"path","name":"quizId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                quiz: {"in":"body","name":"quiz","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"answers":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"point":{"dataType":"double","required":true},"correct":{"dataType":"boolean","required":true},"answer":{"dataType":"string","required":true},"questionId":{"dataType":"string","required":true}}},"required":true},"timeFinished":{"dataType":"double","required":true},"passingScore":{"dataType":"double","required":true},"completed":{"dataType":"boolean","required":true},"totalPoint":{"dataType":"double","required":true}}},
        };
        app.post('/api/course/submit-quiz/:courseId/:quizId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.SubmitQuiz)),

            async function CourseController_SubmitQuiz(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_SubmitQuiz, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'SubmitQuiz',
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
        const argsCourseController_FetchQuizAnswers: Record<string, TsoaRoute.ParameterSchema> = {
                quizId: {"in":"path","name":"quizId","required":true,"dataType":"string"},
        };
        app.get('/api/course/fetch-quiz-answers/:quizId',
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.FetchQuizAnswers)),

            async function CourseController_FetchQuizAnswers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_FetchQuizAnswers, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'FetchQuizAnswers',
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
        const argsCourseController_CompleteLesson: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                lessonId: {"in":"path","name":"lessonId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/course/complete-lesson/:courseId/:lessonId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.CompleteLesson)),

            async function CourseController_CompleteLesson(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_CompleteLesson, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'CompleteLesson',
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
        const argsCourseController_EnrollCourse: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/course/enroll-course/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.EnrollCourse)),

            async function CourseController_EnrollCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_EnrollCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'EnrollCourse',
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
        const argsCourseController_GetUserCourseProgress: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/get-user-course-progress/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetUserCourseProgress)),

            async function CourseController_GetUserCourseProgress(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetUserCourseProgress, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetUserCourseProgress',
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
        const argsCourseController_FetchActivites: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
        };
        app.get('/api/course/fetch-activities/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.FetchActivites)),

            async function CourseController_FetchActivites(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_FetchActivites, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'FetchActivites',
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
        const argsCourseController_FetchSavedCourse: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/fetch-saved-courses',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.FetchSavedCourse)),

            async function CourseController_FetchSavedCourse(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_FetchSavedCourse, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'FetchSavedCourse',
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
        const argsCourseController_GetTutorOverview: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/tutor-overview',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.GetTutorOverview)),

            async function CourseController_GetTutorOverview(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_GetTutorOverview, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'GetTutorOverview',
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
        const argsCourseController_FetchStudentSpiritualGrowth: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/fetch-student_spiritual-growth',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.FetchStudentSpiritualGrowth)),

            async function CourseController_FetchStudentSpiritualGrowth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_FetchStudentSpiritualGrowth, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'FetchStudentSpiritualGrowth',
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
        const argsCourseController_DebugCourseState: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/course/debug-course-state/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourseController)),
            ...(fetchMiddlewares<RequestHandler>(CourseController.prototype.DebugCourseState)),

            async function CourseController_DebugCourseState(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourseController_DebugCourseState, request, response });

                const controller = new CourseController();

              await templateService.apiHandler({
                methodName: 'DebugCourseState',
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
        const argsCertificateController_generateCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"GenerateCertificateBody"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/certificate/generate',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CertificateController)),
            ...(fetchMiddlewares<RequestHandler>(CertificateController.prototype.generateCertificate)),

            async function CertificateController_generateCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCertificateController_generateCertificate, request, response });

                const controller = new CertificateController();

              await templateService.apiHandler({
                methodName: 'generateCertificate',
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
        const argsCertificateController_getCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                certificateId: {"in":"path","name":"certificateId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/certificate/fetch-certificate-by-id/:certificateId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CertificateController)),
            ...(fetchMiddlewares<RequestHandler>(CertificateController.prototype.getCertificate)),

            async function CertificateController_getCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCertificateController_getCertificate, request, response });

                const controller = new CertificateController();

              await templateService.apiHandler({
                methodName: 'getCertificate',
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
        const argsCertificateController_getUserCertificates: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/certificate/user/certificates',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CertificateController)),
            ...(fetchMiddlewares<RequestHandler>(CertificateController.prototype.getUserCertificates)),

            async function CertificateController_getUserCertificates(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCertificateController_getUserCertificates, request, response });

                const controller = new CertificateController();

              await templateService.apiHandler({
                methodName: 'getUserCertificates',
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
        const argsCertificateController_checkCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                courseId: {"in":"path","name":"courseId","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/api/certificate/check/:courseId',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CertificateController)),
            ...(fetchMiddlewares<RequestHandler>(CertificateController.prototype.checkCertificate)),

            async function CertificateController_checkCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCertificateController_checkCertificate, request, response });

                const controller = new CertificateController();

              await templateService.apiHandler({
                methodName: 'checkCertificate',
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
