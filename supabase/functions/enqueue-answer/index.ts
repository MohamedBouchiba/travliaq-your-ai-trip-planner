import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnqueueRequest {
  answer_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answer_id }: EnqueueRequest = await req.json();

    if (!answer_id || typeof answer_id !== 'string') {
      console.error('Invalid answer_id provided');
      return new Response(
        JSON.stringify({ ok: false, error: 'answer_id is required and must be a string' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const AWS_REGION = Deno.env.get('AWS_REGION');
    const SQS_QUEUE_URL = Deno.env.get('SQS_QUEUE_URL');
    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    if (!AWS_REGION || !SQS_QUEUE_URL || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('Missing AWS configuration');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare SQS message
    const messageBody = JSON.stringify({ answer_id });
    
    // AWS Signature V4
    const service = 'sqs';
    const method = 'POST';
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const datestamp = timestamp.slice(0, 8);
    
    const canonicalUri = '/';
    const canonicalQuerystring = '';
    const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:sqs.${AWS_REGION}.amazonaws.com\nx-amz-date:${timestamp}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    
    const payload = `Action=SendMessage&MessageBody=${encodeURIComponent(messageBody)}&QueueUrl=${encodeURIComponent(SQS_QUEUE_URL)}`;
    
    // Create canonical request
    const encoder = new TextEncoder();
    const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
    const payloadHashHex = Array.from(new Uint8Array(payloadHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHashHex}`;
    
    const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create string to sign
    const credentialScope = `${datestamp}/${AWS_REGION}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${canonicalRequestHashHex}`;
    
    // Calculate signature
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await hmac(`AWS4${key}`, dateStamp);
      const kRegion = await hmac(kDate, regionName);
      const kService = await hmac(kRegion, serviceName);
      const kSigning = await hmac(kService, 'aws4_request');
      return kSigning;
    };
    
    const hmac = async (key: string | ArrayBuffer, data: string) => {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        typeof key === 'string' ? encoder.encode(key) : key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
    };
    
    const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, datestamp, AWS_REGION, service);
    const signature = Array.from(new Uint8Array(await hmac(signingKey, stringToSign)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create authorization header
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Send request to SQS
    console.log(`[${new Date().toISOString()}] Sending answer_id: ${answer_id} to SQS`);
    
    const sqsResponse = await fetch(`https://sqs.${AWS_REGION}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Amz-Date': timestamp,
        'Authorization': authorizationHeader,
      },
      body: payload,
    });

    if (!sqsResponse.ok) {
      const errorText = await sqsResponse.text();
      console.error(`SQS error: ${sqsResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to enqueue message' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${new Date().toISOString()}] Successfully enqueued answer_id: ${answer_id}`);
    
    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error in enqueue-answer:`, error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
