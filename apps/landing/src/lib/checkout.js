const WORKER_URL = 'https://pinthat-auth.el-lee.workers.dev';

function getUsername() {
  return new URLSearchParams(window.location.search).get('username') || '';
}

export async function startCheckout(event) {
  const username = getUsername();
  if (!username) {
    alert('PinThat Extension에서 GitHub 로그인 후,\nExtension의 구매 버튼을 이용해주세요.');
    return;
  }
  const btn = event.currentTarget;
  const orig = btn.innerHTML;
  btn.innerHTML = '처리 중...';
  btn.disabled = true;
  try {
    const res = await fetch(`${WORKER_URL}/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        successUrl:
          window.location.origin +
          '/success.html?username=' +
          encodeURIComponent(username),
        cancelUrl: window.location.href,
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || '결제 페이지를 열 수 없습니다.');
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  } catch {
    alert('네트워크 오류');
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}
