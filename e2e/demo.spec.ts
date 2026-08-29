import { expect, test } from "@playwright/test";

test("fictional demo renders and print action triggers",async({page})=>{
  const externalOrApi:string[]=[];page.on("request",request=>{const url=request.url();if(url.includes("/api/")||/googleapis|firebaseio|google-analytics/.test(url))externalOrApi.push(url);});
  await page.goto("/demo");
  await page.evaluate(()=>{window.print=()=>{document.body.dataset.printed="true";};});
  await expect(page.getByRole("heading",{name:"Fictional thyroid case"})).toBeVisible();
  await expect(page.getByText("Evidence that does not fully fit")).toBeVisible();
  await page.getByRole("button",{name:/Ask AI/}).click();
  await expect(page.getByRole("dialog",{name:"Ask about this assessment"})).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow","hidden");
  const panel=page.locator(".ask-ai-panel");
  await expect(panel).toHaveCSS("pointer-events","auto");
  await expect.poll(()=>panel.evaluate(element=>Math.round(element.getBoundingClientRect().right))).toBe(await page.evaluate(()=>window.innerWidth));
  const scrollBefore=await page.evaluate(()=>window.scrollY);
  await page.mouse.move(80,500);await page.mouse.wheel(0,500);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(scrollBefore);
  await expect(page.getByText("Ask AI works with your own report")).toBeVisible();
  await page.getByRole("button",{name:"Close Ask AI"}).click();
  await expect(page.getByRole("dialog",{name:"Ask about this assessment"})).toBeHidden();
  await expect(page.getByRole("button",{name:/Ask AI/})).toBeFocused();
  await page.getByRole("button",{name:/Print/}).click();
  await expect.poll(()=>page.evaluate(()=>document.body.dataset.printed)).toBe("true");
  await page.emulateMedia({media:"print"});
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.getByText(/Generated/)).toBeVisible();
  expect(externalOrApi).toEqual([]);
});

test("landing and demo fit a 360px mobile viewport",async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"A second look at your records, before your next appointment."})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.goto("/demo");
  await expect(page.getByRole("heading",{name:"Fictional thyroid case"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("email and password account access is complete and responsive",async({page})=>{
  await page.route("https://identitytoolkit.googleapis.com/**",route=>route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({error:{code:400,message:"INVALID_LOGIN_CREDENTIALS"}})}));
  await page.goto("/login");
  await expect(page.getByRole("tab",{name:"Sign in"})).toHaveAttribute("aria-selected","true");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Forgot password?"})).toBeVisible();
  await page.getByLabel("Email").fill("existing@example.com");
  await page.getByLabel("Password",{exact:true}).fill("sixsix");
  await page.getByRole("button",{name:"Sign in with email"}).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();
  await expect(page.getByText("Password must contain at least 8 characters.")).toHaveCount(0);
  await page.getByRole("tab",{name:"Create account"}).click();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByRole("button",{name:"Create account",exact:true})).toBeVisible();
  await page.setViewportSize({width:360,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("Vietnamese mode localizes navigation and demo report content",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:"VI"}).click();
  await expect(page.getByRole("heading",{name:"Xem lại hồ sơ trước buổi khám tiếp theo."})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang","vi");
  await page.goto("/demo");
  const vietnameseHeading=page.getByRole("heading",{name:"Ca tuyến giáp giả lập"});
  await expect(vietnameseHeading).toBeVisible();
  expect(await vietnameseHeading.evaluate(element=>getComputedStyle(element).fontFamily)).not.toContain("Georgia");
  await expect(page.getByText("Nhận định chính",{exact:true})).toBeVisible();
  await expect(page.getByText(/Chẩn đoán lo âu chưa giải thích đầy đủ/)).toBeVisible();
});

test("public interface does not expose implementation terminology",async({page})=>{
  for(const path of ["/","/login","/privacy","/terms","/demo"]){
    await page.goto(path);
    await expect(page.locator("body")).not.toContainText(/firebase|firestore/i);
  }
});

test("public screens stay aligned across phone and desktop layouts",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("second-opinion-anonymous-analytics","declined"));
  for(const width of [320,480,768,1024,1440]){
    await page.setViewportSize({width,height:850});
    for(const path of ["/","/login","/demo"]){
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({width:768,height:850});
  await page.goto("/");
  await page.getByRole("button",{name:"VI"}).click();
  for(const path of ["/","/login","/demo"]){
    await page.goto(path);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
});

test("report navigation and privacy choice behave like finished product controls",async({page})=>{
  await page.goto("/demo");
  const header=page.locator(".site-header");
  await page.getByRole("button",{name:/Ask AI/i}).click();
  const chatGeometry=await page.evaluate(()=>{
    const nav=document.querySelector(".site-header")!.getBoundingClientRect();
    const chat=document.querySelector(".ask-ai-panel")!.getBoundingClientRect();
    return {navBottom:Math.round(nav.bottom),chatTop:Math.round(chat.top)};
  });
  expect(chatGeometry.chatTop).toBeGreaterThanOrEqual(chatGeometry.navBottom-1);
  await page.getByRole("button",{name:"Close Ask AI"}).click();
  await page.evaluate(()=>window.scrollTo(0,700));
  await expect(header).toHaveClass(/header-hidden/);
  await page.evaluate(()=>window.scrollTo(0,300));
  await expect(header).not.toHaveClass(/header-hidden/);

  const reportRail=page.locator(".report-command-bar");
  await expect.poll(()=>reportRail.evaluate(element=>element.getBoundingClientRect().width)).toBeLessThan(80);
  const toolGeometry=await reportRail.locator(".report-tools>button").evaluateAll(buttons=>buttons.map(button=>{
    const rect=button.getBoundingClientRect();
    return {width:Math.round(rect.width),height:Math.round(rect.height),left:Math.round(rect.left)};
  }));
  expect(toolGeometry).toHaveLength(2);
  expect(toolGeometry[0]).toEqual(toolGeometry[1]);
  const collapsedGeometry=await page.evaluate(()=>{
    const rail=document.querySelector(".report-command-bar")!.getBoundingClientRect();
    const report=document.querySelector(".clinical-report")!.getBoundingClientRect();
    return {railRight:rail.right,reportLeft:report.left};
  });
  expect(collapsedGeometry.railRight).toBeLessThan(collapsedGeometry.reportLeft);
  await reportRail.hover();
  await expect.poll(()=>reportRail.evaluate(element=>element.getBoundingClientRect().width)).toBeLessThan(80);
  const evidenceLink=page.getByRole("link",{name:"Evidence",exact:true});
  await evidenceLink.hover();
  await expect(evidenceLink.locator("span")).toBeVisible();
  const popoutGeometry=await page.evaluate(()=>{
    const rail=document.querySelector(".report-command-bar")!.getBoundingClientRect();
    const report=document.querySelector(".clinical-report")!.getBoundingClientRect();
    const popout=document.querySelector(".report-command-bar a:hover span")!.getBoundingClientRect();
    return {railRight:rail.right,reportLeft:report.left,popoutLeft:popout.left};
  });
  expect(popoutGeometry.railRight).toBeLessThan(popoutGeometry.reportLeft);
  expect(popoutGeometry.popoutLeft).toBeGreaterThanOrEqual(popoutGeometry.railRight);
  await evidenceLink.click();
  await expect(page).toHaveURL(/#evidence$/);
  await expect(page.locator("#evidence")).toBeInViewport();

  await page.setViewportSize({width:1024,height:700});
  await page.goto("/demo");
  const fullHeader=await page.locator(".site-header").evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return {left:Math.round(rect.left),right:Math.round(rect.right)};
  });
  expect(fullHeader).toEqual({left:0,right:1024});
  const compactRail=page.locator(".report-command-bar");
  await expect(compactRail).toHaveCSS("position","fixed");
  for(const action of [page.getByRole("button",{name:/Ask AI/i}),page.getByRole("button",{name:/Copy visit brief/i})]){
    await action.hover();
    const label=action.locator(":scope > span");
    await expect(label).toBeVisible();
    const geometry=await Promise.all([
      compactRail.evaluate(element=>element.getBoundingClientRect().right),
      label.evaluate(element=>element.getBoundingClientRect().left),
    ]);
    expect(geometry[1]).toBeGreaterThanOrEqual(geometry[0]);
  }

  await page.setViewportSize({width:900,height:700});
  await page.goto("/demo");
  await expect(page.locator(".report-command-bar")).toHaveCSS("position","static");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);

  await page.goto("/");
  const consent=page.getByLabel("Analytics choice");
  await expect(consent).toBeVisible();
  await consent.getByRole("button",{name:"No thanks"}).click();
  await expect(consent).toBeHidden();
  await page.reload();
  await expect(page.getByLabel("Analytics choice")).toBeHidden();
});

test("clinical supporting text remains readable and scannable",async({page})=>{
  await page.goto("/demo");
  const contrast=await page.evaluate(()=>{
    const parse=(value:string)=>value.slice(value.indexOf("(")+1,value.indexOf(")")).split(",").slice(0,3).map(Number);
    const luminance=(color:number[])=>{const values=color.map(value=>{const normalized=value/255;return normalized<=.03928?normalized/12.92:((normalized+.055)/1.055)**2.4;});return .2126*values[0]+.7152*values[1]+.0722*values[2];};
    const ratio=(foreground:string,background:string)=>{const a=luminance(parse(foreground));const b=luminance(parse(background));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
    return [
      [".report-stats span",".report-stats div"],
      [".clinical-disclaimer",".clinical-disclaimer"],
      [".source-chip",".source-chip"],
    ].map(([textSelector,backgroundSelector])=>ratio(getComputedStyle(document.querySelector(textSelector)!).color,getComputedStyle(document.querySelector(backgroundSelector)!).backgroundColor));
  });
  expect(contrast.every(value=>value>=4.5)).toBe(true);
  await expect(page.locator(".evidence-column article h4").first()).toHaveCSS("display","flex");
});
