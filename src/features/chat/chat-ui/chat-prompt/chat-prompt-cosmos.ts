"use server";

import { CosmosDBContainer } from "@/features/common/cosmos-prompt";
import { SqlQuerySpec } from "@azure/cosmos";

import {
    PromptList
  } from "../../chat-services/models";
  interface Item {
    title: string,
    content: string,
    id: string,
    dept: string
    usename: string
  }

export const AddPrompt = async (newPrompt:Item) => {
    //console.log(newPrompt);
    const container = await CosmosDBContainer.getInstance().getContainer();
    await container.items.create(newPrompt);

};
export async function queryPrompt(dept:string,usename:string) {
  const container = await CosmosDBContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM c WHERE c.dept = @dept AND c.usename = @usename",
    parameters: [
        {
          name: "@dept",
          value: dept,
        },
        {
          name: "@usename",
          value: usename,
        },
    ],
  };

  const { resources } = await container.items
    .query<PromptList>(querySpec)
    .fetchAll();

    return resources;
  }