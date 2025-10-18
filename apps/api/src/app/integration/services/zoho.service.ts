import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AnyObject } from "@nextier/common";
import axios, { AxiosInstance } from "axios";
import {
  ZohoAuthData,
  ZohoRecordOptions,
  ZohoRecordResult,
} from "../types/zoho.type";

@Injectable()
export class ZohoService {
  private http: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(private configService: ConfigService) {
    this.http = axios.create();
    this.clientId = this.configService.get("ZOHO_CLIENT_ID") as string;
    this.clientSecret = this.configService.get("ZOHO_CLIENT_SECRET") as string;
    this.redirectUri =
      this.configService.get("APP_URL") + "/oauth/zoho/callback";
  }

  connect(state: string) {
    const scopes = this.configService.get("ZOHO_SCOPES");
    const zohoAuthUri = "https://accounts.zoho.com/oauth/v2/auth";

    const uri = `${zohoAuthUri}?scope=${scopes}&client_id=${this.clientId}&response_type=code&access_type=offline&redirect_uri=${this.redirectUri}&state=${state}`;

    return {
      uri,
      method: "oauth",
    };
  }

  async generateRefreshToken(refreshToken: string) {
    const baseURI = "https://accounts.zoho.com";
    const uri = `${baseURI}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=refresh_token`;
    const { data } = await this.http.post(uri);
    return data;
  }

  async generateToken(options: AnyObject) {
    const accountServer = options["accounts-server"];
    const zohoAuthUri = `${accountServer}/oauth/v2/token`;

    const { data } = await this.http.postForm(zohoAuthUri, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: this.redirectUri,
    });

    return data;
  }

  getPath(apiDomain: string, path: string) {
    return `${apiDomain}${path}`;
  }

  getHearders(token: string, otherHeaders?: Record<string, any>) {
    return {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        ...otherHeaders,
      },
    };
  }

  filterUsefulFields(fields: any[], shouldIgnore = false) {
    if (shouldIgnore) {
      return fields;
    }

    const standardLeadFields = [
      "First_Name",
      "Last_Name",
      "Company",
      "Email",
      "Phone",
      "Mobile",
      "Lead_Source",
      "Lead_Status",
      "Street",
      "City",
      "State",
      "Zip_Code",
      "Country",
      "Website",
      "Industry",
      "Annual_Revenue",
      "No_of_Employees",
      "Description",
      "Rating",
    ];
    return fields.filter((field) =>
      standardLeadFields.includes(field.api_name),
    );
  }

  async fields(authData: ZohoAuthData, apiName: string) {
    const path = this.getPath(authData.api_domain, "/crm/v8/settings/fields");
    const { data } = await this.http.get(path, {
      params: {
        module: apiName,
      },
      ...this.getHearders(authData.access_token),
    });

    return this.filterUsefulFields(data.fields, true);
  }

  async records(authData: ZohoAuthData, options: ZohoRecordOptions) {
    const path = this.getPath(
      authData.api_domain,
      `/crm/v8/${options.moduleName}`,
    );

    const params: AnyObject = {
      fields: options.fields.join(","),
    };

    if (options.pageToken) {
      params.page_token = options.pageToken;
    }

    if (options.perPage) {
      params.per_page = options.perPage;
    }

    const { data } = await this.http.get<ZohoRecordResult>(path, {
      params,
      ...this.getHearders(authData.access_token),
    });

    return data;
  }
}
