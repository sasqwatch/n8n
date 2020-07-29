import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	eventOperations,
	eventFields,
} from './EventDescription';

import {
	issueOperations,
	issueFields,
} from './IssueDescription';

import {
	organizationFields,
	organizationOperations,
} from './OrganizationDescription';

import {
	projectOperations,
	projectFields,
} from './ProjectDescription';

import {
	releaseOperations,
	releaseFields,
} from './ReleaseDescription';

import {
	teamOperations,
	teamFields,
} from './TeamDescription';

import {
	sentryioApiRequest,
	sentryApiRequestAllItems,
} from './GenericFunctions';

export class Sentryio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sentry.io',
		name: 'sentryio',
		icon: 'file:sentryio.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Sentry.io API',
		defaults: {
			name: 'Sentry.io',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sentryioOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
			{
				name: 'sentryioApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Release',
						value: 'release',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Team',
						value: 'team',
					},
				],
				default: 'event',
				description: 'Resource to consume.',
			},

		// EVENT
		...eventOperations,
		...eventFields,

		// ISSUE
		...issueOperations,
		...issueFields,

		// ORGANIZATION
		...organizationOperations,
		...organizationFields,

		// PROJECT
		...projectOperations,
		...projectFields,

		// RELEASE
		...releaseOperations,
		...releaseFields,

		// TEAM
		...teamOperations,
		...teamFields
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'event') {
				if (operation === 'getAll') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const projectSlug = this.getNodeParameter('projectSlug', i) as string;
					const full = this.getNodeParameter('full', i) as boolean;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/events/`;

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
					}

					qs.full = full;

					responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}
				if (operation === 'get') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const projectSlug = this.getNodeParameter('projectSlug', i) as string;
					const eventId = this.getNodeParameter('eventId', i) as string;

					const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`;

					responseData = await sentryioApiRequest.call(this, 'GET', endpoint, qs);
				}
			}
			if (resource === 'issue') {
				if (operation === 'getAll') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const projectSlug = this.getNodeParameter('projectSlug', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/issues/`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.statsPeriod) {
						qs.statsPeriod = additionalFields.statsPeriod as string;
					}
					if (additionalFields.shortIdLookup) {
						qs.shortIdLookup  = additionalFields.shortIdLookup  as boolean;
					}
					if (additionalFields.query ) {
						qs.query   = additionalFields.query   as string;
					}

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
					}

					responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}

				}
				if (operation === 'get') {
					const issueId = this.getNodeParameter('issueId', i) as string;
					const endpoint = `/api/0/issues/${issueId}/`;

					responseData = await sentryioApiRequest.call(this, 'GET', endpoint, qs);
				}
				if (operation === 'delete') {
					const issueId = this.getNodeParameter('issueId', i) as string;
					const endpoint = `/api/0/issues/${issueId}/`;

					responseData = await sentryioApiRequest.call(this, 'DELETE', endpoint, qs);

					responseData = { success: true };
				}
				if (operation === 'update') {
					const issueId = this.getNodeParameter('issueId', i) as string;
					const endpoint = `/api/0/issues/${issueId}/`;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.status) {
						qs.status = additionalFields.status as string;
					}
					if (additionalFields.assignedTo) {
						qs.assignedTo = additionalFields.assignedTo as string;
					}
					if (additionalFields.hasSeen) {
						qs.hasSeen = additionalFields.hasSeen as boolean;
					}
					if (additionalFields.isBookmarked) {
						qs.isBookmarked = additionalFields.isBookmarked as boolean;
					}
					if (additionalFields.isSubscribed) {
						qs.isSubscribed = additionalFields.isSubscribed as boolean;
					}
					if (additionalFields.isPublic) {
						qs.isPublic = additionalFields.isPublic as boolean;
					}

					responseData = await sentryioApiRequest.call(this, 'PUT', endpoint, qs);
				}
			}
			if (resource === 'organization') {
				if (operation === 'get') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const endpoint = `/api/0/organizations/${organizationSlug}/`;

					responseData = await sentryioApiRequest.call(this, 'GET', endpoint, qs);
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const endpoint = `/api/0/organizations/`;

					if (additionalFields.member) {
						qs.member = additionalFields.member as boolean;
					}
					if (additionalFields.owner) {
						qs.owner = additionalFields.owner as boolean;
					}

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
					}

					responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					if (responseData === undefined) {
						responseData = [];
					}

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const agreeTerms = this.getNodeParameter('agreeTerms', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const endpoint = `/api/0/organizations/`;

					qs.name = name;
					qs.agreeTerms = agreeTerms;

					if (additionalFields.slug) {
						qs.slug = additionalFields.slug as string;
					}

					responseData = await sentryioApiRequest.call(this, 'POST', endpoint, qs);
				}
			}
			if (resource === 'project') {
				if (operation === 'get') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const projectSlug = this.getNodeParameter('projectSlug', i) as string;
					const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/`;

					responseData = await sentryioApiRequest.call(this, 'GET', endpoint, qs);
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const endpoint = `/api/0/projects/`;

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
					}

					responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}
			}
			if (resource === 'release') {
				if (operation === 'get') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const version = this.getNodeParameter('version', i) as string;
					const endpoint = `/api/0/organizations/${organizationSlug}/releases/${version}/`;

					responseData = await sentryioApiRequest.call(this, 'GET', endpoint, qs);
				}
				if (operation === 'getAll') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const endpoint = `/api/0/organizations/${organizationSlug}/releases/`;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (additionalFields.query) {
						qs.query = additionalFields.query as string;
					}

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
					}

					responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}
			}
			if (resource === 'team') {
				if (operation === 'get') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const teamSlug = this.getNodeParameter('teamSlug', i) as string;
					const endpoint = `/api/0/teams/${organizationSlug}/${teamSlug}/`;

					responseData = await sentryioApiRequest.call(this, 'GET', endpoint, qs);
				}
				if (operation === 'getAll') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const endpoint = `/api/0/organizations/${organizationSlug}/teams/`;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
					}

					responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}

				if (operation === 'create') {
					const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
					const endpoint = `/api/0/organizations/${organizationSlug}/teams/`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.name) {
						qs.name = additionalFields.name;
					}

					if (additionalFields.slug) {
						qs.slug = additionalFields.slug;
					}

					responseData = await sentryioApiRequest.call(this, 'POST', endpoint, qs);
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

