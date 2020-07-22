import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	allFields,
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	contactOperations,
	contactFields,
} from './ContactDescription';

import * as moment from 'moment';

export class GoogleContact implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Contacts',
		name: 'googleContact',
		icon: 'file:googleContact.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Contacts API.',
		defaults: {
			name: 'Google Contacts',
			color: '#1a73e8',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleContactOAuth2Api',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				description: 'The resource to operate on.'
			},
			...contactOperations,
			...contactFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the calendars to display them to user so that he can
			// select them easily
			async getGroups(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await googleApiRequestAllItems.call(
					this,
					'contactGroups',
					'GET',
					`/contactGroups`,
					);
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.resourceName;
					returnData.push({
						name: groupName,
						value: groupId
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'contact') {
				//https://developers.google.com/calendar/v3/reference/events/insert
				if (operation === 'create') {
					const familyName = this.getNodeParameter('familyName', i) as string;
					const givenName = this.getNodeParameter('givenName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						names: [
							{
								familyName,
								givenName,
								middleName: '',
							},
						],
					};

					if (additionalFields.middleName) {
						//@ts-ignore
						body.names[0].middleName = additionalFields.middleName as string;
					}

					if (additionalFields.companyUi) {
						const companyValues = (additionalFields.companyUi as IDataObject).companyValues as IDataObject[];
						body.organizations = companyValues;
					}

					if (additionalFields.phoneUi) {
						const phoneValues = (additionalFields.phoneUi as IDataObject).phoneValues as IDataObject[];
						body.phoneNumbers = phoneValues;
					}

					if (additionalFields.addressesUi) {
						const addressesValues = (additionalFields.addressesUi as IDataObject).addressesValues as IDataObject[];
						body.addresses = addressesValues;
					}

					if (additionalFields.relationsUi) {
						const relationsValues = (additionalFields.relationsUi as IDataObject).relationsValues as IDataObject[];
						body.relations = relationsValues;
					}

					if (additionalFields.eventsUi) {
						const eventsValues = (additionalFields.eventsUi as IDataObject).eventsValues as IDataObject[];
						for (let i = 0; i < eventsValues.length; i++) {
							const [month, day, year] = moment(eventsValues[i].date as string).format('MM/DD/YYYY').split('/');
							eventsValues[i] = {
								date: {
									day,
									month,
									year,
								},
								type: eventsValues[i].type,
							};
						}
						body.events = eventsValues;
					}

					if (additionalFields.birthday) {
						const [month, day, year] = moment(additionalFields.birthday as string).format('MM/DD/YYYY').split('/');

						body.birthdays = [
							{
								date: {
									day,
									month,
									year
								}
							}
						];
					}

					if (additionalFields.emailsUi) {
						const emailsValues = (additionalFields.emailsUi as IDataObject).emailsValues as IDataObject[];
						body.emailAddresses = emailsValues;
					}

					if (additionalFields.biographies) {
						body.biographies = [
							{
								value: additionalFields.biographies,
								contentType: 'TEXT_PLAIN',
							},
						];
					}

					if (additionalFields.customFieldsUi) {
						const customFieldsValues = (additionalFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];
						body.userDefined = customFieldsValues;
					}

					if (additionalFields.group) {
						const memberships = (additionalFields.group as string[]).map((groupId: string) => {
							return {
								contactGroupMembership: {
									contactGroupResourceName: groupId
								}
							};
						});

						body.memberships = memberships;
					}

					responseData = await googleApiRequest.call(
						this,
						'POST',
						`/people:createContact`,
						body,
						qs
					);
				}
				//https://developers.google.com/people/api/rest/v1/people/deleteContact
				if (operation === 'delete') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					responseData = await googleApiRequest.call(
						this,
						'DELETE',
						`/people/${contactId}:deleteContact`,
						{}
					);
					responseData = { success: true };
				}
				//https://developers.google.com/people/api/rest/v1/people/get
				if (operation === 'get') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					const fields = this.getNodeParameter('fields', i) as string[];

					qs.personFields = (fields as string[]).join(',');

					responseData = await googleApiRequest.call(
						this,
						'GET',
						`/people/${contactId}`,
						{},
						qs,
					);
				}
				//https://developers.google.com/people/api/rest/v1/people.connections/list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const fields = this.getNodeParameter('fields', i) as string[];
					const options = this.getNodeParameter('options', i) as IDataObject;

					if (options.sortOrder) {
						qs.sortOrder = options.sortOrder as number;
					}

					if (fields.includes('*')) {
						qs.personFields = allFields.join(',');
					} else {
						qs.personFields = (fields as string[]).join(',');
					}

					if (returnAll) {
						responseData = await googleApiRequestAllItems.call(
							this,
							'connections',
							'GET',
							`/people/me/connections`,
							{},
							qs,
						);
					} else {
						qs.pageSize = this.getNodeParameter('limit', i) as number;
						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/people/me/connections`,
							{},
							qs,
						);
						responseData = responseData.connections;
					}
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}