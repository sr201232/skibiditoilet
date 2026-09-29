import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let client=null,session=null;
const listeners=new Set();
const byId=id=>document.getElementById(id);

function ensureDialog(){
 if(byId('auth-dialog'))return;
 const dialog=document.createElement('dialog');dialog.id='auth-dialog';dialog.className='auth-dialog';
 dialog.innerHTML=`<div class="auth-card"><button class="auth-close" type="button" aria-label="닫기">×</button><div id="auth-signed-out"><span class="eyebrow">바로화장실 회원</span><h2>로그인</h2><p>후기를 작성하고 내가 쓴 글을 관리할 수 있어요.</p><button id="google-login" class="google-login" type="button"><span aria-hidden="true">G</span> Google 계정으로 계속하기</button><div class="auth-divider"><span>또는 이메일로</span></div><form id="email-auth-form"><label>이메일<input id="auth-email" type="email" autocomplete="email" required></label><label>비밀번호<input id="auth-password" type="password" autocomplete="current-password" minlength="6" required></label><div class="auth-actions"><button class="primary compact" type="submit">로그인</button><button id="email-signup" class="secondary" type="button">회원가입</button></div></form><p id="auth-message" class="auth-message" role="status"></p></div><div id="auth-signed-in" hidden><span class="eyebrow">로그인됨</span><h2 id="auth-user-name">회원</h2><p id="auth-user-email"></p><button id="logout" class="secondary wide" type="button">로그아웃</button></div></div>`;
 document.body.append(dialog);
 dialog.querySelector('.auth-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 byId('google-login').onclick=googleLogin;
 byId('email-auth-form').onsubmit=emailLogin;
 byId('email-signup').onclick=emailSignup;
 byId('logout').onclick=logout;
}

function message(text,error=false){const node=byId('auth-message');if(!node)return;node.textContent=text;node.classList.toggle('error',error);}
function displayName(user){return user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split('@')[0]||'회원';}
function render(){
 const button=byId('auth-button');if(button){button.textContent=session?displayName(session.user):'로그인';button.classList.toggle('signed-in',!!session);}
 const signedOut=byId('auth-signed-out'),signedIn=byId('auth-signed-in');
 if(signedOut&&signedIn){signedOut.hidden=!!session;signedIn.hidden=!session;if(session){byId('auth-user-name').textContent=displayName(session.user);byId('auth-user-email').textContent=session.user.email||'Google 계정';}}
 window.dispatchEvent(new CustomEvent('authchange',{detail:{session,client}}));listeners.forEach(fn=>fn(session));
}
function openAuth(){ensureDialog();render();byId('auth-dialog').showModal();}
async function googleLogin(){
 if(!client)return message('로그인 연결을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.',true);
 message('Google 로그인 화면으로 이동합니다.');
 const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}${location.pathname}`}});if(error)message(error.message,true);
}
async function emailLogin(event){event.preventDefault();message('로그인 중입니다.');const {error}=await client.auth.signInWithPassword({email:byId('auth-email').value,password:byId('auth-password').value});if(error)message(error.message,true);else{message('로그인되었습니다.');setTimeout(()=>byId('auth-dialog').close(),350);}}
async function emailSignup(){const form=byId('email-auth-form');if(!form.reportValidity())return;message('가입 정보를 등록하고 있습니다.');const {error}=await client.auth.signUp({email:byId('auth-email').value,password:byId('auth-password').value,options:{emailRedirectTo:`${location.origin}${location.pathname}`}});message(error?error.message:'확인 메일을 보냈습니다. 이메일의 링크를 눌러 가입을 완료해 주세요.',!!error);}
async function logout(){if(client)await client.auth.signOut();byId('auth-dialog')?.close();}

export const ready=(async()=>{
 ensureDialog();byId('auth-button')?.addEventListener('click',openAuth);
 try{const response=await fetch('/api/config');if(!response.ok)throw Error();const config=await response.json();byId('google-login').hidden=!config.googleEnabled;document.querySelector('.auth-divider').hidden=!config.googleEnabled;client=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:true,detectSessionInUrl:true}});session=(await client.auth.getSession()).data.session;client.auth.onAuthStateChange((_event,next)=>{session=next;render();});render();return client;}catch{const button=byId('auth-button');if(button){button.textContent='로그인 준비 중';button.disabled=true;}message('로그인 연결 설정을 확인해 주세요.',true);return null;}
})();

export const getSupabase=()=>client;
export const getSession=()=>session;
export function onAuthChange(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function requireLogin(){if(session)return session;openAuth();return null;}
