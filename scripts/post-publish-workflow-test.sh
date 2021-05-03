#!/usr/bin/env bash

CircleCIToken=$1
curl -v -u ${CircleCIToken}: -X POST --header "Content-Type: application/json" -d '{
  "branch": "sh/postPublishPort",
  "parameters": {
    "causeican": true
  }
}' https://circleci.com/api/v2/project/gh/forcedotcom/salesforcedx-apex/pipeline

# open the release pipe line url
open "https://circleci.com/api/v2/project/gh/forcedotcom/salesforcedx-apex/pipeline"