import { beforeEach, describe, expect, it, vi } from "vitest";

const {requireUser,get,recursiveDelete,doc}=vi.hoisted(()=>{const get=vi.fn();return{requireUser:vi.fn(),get,recursiveDelete:vi.fn(),doc:vi.fn(()=>({get}))};});
vi.mock("@/lib/server/auth",()=>({requireUser}));
vi.mock("@/lib/server/firebase-admin",()=>({adminServices:()=>({db:{doc,recursiveDelete}})}));
import { DELETE } from "@/app/api/cases/[caseId]/route";

const request=new Request("http://test/api/cases/case_1",{method:"DELETE"});const context={params:Promise.resolve({caseId:"case_1"})};
describe("case deletion route",()=>{
  beforeEach(()=>{requireUser.mockReset().mockResolvedValue({uid:"user_1"});get.mockReset();recursiveDelete.mockReset().mockResolvedValue(undefined);doc.mockClear();});
  it("isolates a mismatched owner",async()=>{get.mockResolvedValue({exists:true,data:()=>({ownerUid:"other_user"})});const response=await DELETE(request,context);expect(response.status).toBe(404);expect(recursiveDelete).not.toHaveBeenCalled();});
  it("is successful when the case is already missing",async()=>{get.mockResolvedValue({exists:false});const response=await DELETE(request,context);expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true});expect(recursiveDelete).toHaveBeenCalled();});
});
