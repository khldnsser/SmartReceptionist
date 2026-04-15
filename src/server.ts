import express from 'express';                                                                                                      
  import { config } from './config';                        
  import { handleVerification } from './whatsapp/webhook';
  import { handleWhatsAppMessage } from './app';                                                                                      
   
  const app = express();                                                                                                              
                                                            
  app.use(express.json());                                                                                                            
   
  // ─── Health check ─────────────────────────────────────────────────────────────                                                   
  app.get('/health', (_req, res) => {                       
    res.json({ status: 'ok', timestamp: new Date().toISOString() });                                                                  
  });
                                                                                                                                      
  // ─── OAuth Callback (Gmail) ───────────────────────────────────────────────────                                                   
  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code as string | undefined;                                                                                
    const error = req.query.error as string | undefined;                                                                              
   
    if (error) {                                                                                                                      
      res.status(400).send(`Authorization failed: ${error}`);
      return;                                                                                                                         
    }
                                                                                                                                      
    if (!code) {                                            
      res.status(400).send('Missing authorization code in callback');
      return;
    }
                                                                                                                                      
    try {
      // Exchange authorization code for refresh token                                                                                
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({                                                                                                   
          client_id: config.google.gmail.clientId,
          client_secret: config.google.gmail.clientSecret,                                                                            
          code,                                                                                                                       
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000/auth/callback',                                                                        
        }).toString(),                                      
      });                                                                                                                             
   
      const data = (await response.json()) as {                                                                                       
        refresh_token?: string;                             
        error?: string;
      };

      if (data.error) {                                                                                                               
        res.status(400).send(`Token exchange failed: ${data.error}`);
        return;                                                                                                                       
      }                                                     

      if (!data.refresh_token) {
        res.status(400).send('No refresh token in response');
        return;                                                                                                                       
      }
                                                                                                                                      
      const refreshToken = data.refresh_token;              

      res.send(`
        <h1>✅ Authorization Successful!</h1>
        <p>Your refresh token:</p>                                                                                                    
        <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">                                  
  ${refreshToken}                                                                                                                     
        </pre>                                                                                                                        
        <p><strong>Copy this token and add it to your .env file as:</strong></p>
        <pre>GMAIL_REFRESH_TOKEN=${refreshToken}</pre>                                                                                
        <p>You can now close this window.</p>                                                                                         
      `);
    } catch (err) {                                                                                                                   
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).send(`Authorization error: ${message}`);
    }                                                                                                                                 
  });
                                                                                                                                      
  // ─── WhatsApp webhook ─────────────────────────────────────────────────────────
  app.get('/webhook', handleVerification);
  app.post('/webhook', handleWhatsAppMessage);                                                                                        
   
  // ─── Start ────────────────────────────────────────────────────────────────────                                                   
  app.listen(config.port, () => {                           
    console.log(`Clinic AI Receptionist running on port ${config.port}`);                                                             
    console.log(`Webhook endpoint: POST /webhook`);         
    console.log(`Health check:     GET  /health`);
  });                                                                                                                                 
   
  export default app;            