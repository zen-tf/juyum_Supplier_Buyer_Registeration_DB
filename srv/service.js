const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    const { RegistrationSessions } = this.entities;

    // 1. 내역 확인 로직
    this.on('checkActiveSession', async (req) => {
        const currentUserId = req.user.id;
        const session = await SELECT.one.from(RegistrationSessions).where({ 
            userId: currentUserId, 
            status: { '!=': 'COMPLETED' } 
        });
        return !!session; // 존재하면 true, 없으면 false
    });

    // 2. 초기화 및 새 시작 로직
    this.on('initializeSession', async (req) => {
        const currentUserId = req.user.id; 
        
        // 기존 미완료 내역 싹 지우기
        await DELETE.from(RegistrationSessions).where({ 
            userId: currentUserId, 
            status: { '!=': 'COMPLETED' } 
        });
        
        // 새 데이터 삽입
        await INSERT.into(RegistrationSessions).entries({
            userId: currentUserId,
            status: 'INIT'
        });

        return "신규 등록 프로세스를 시작합니다. 등록 주체가 구매 업체(Buyer)입니까, 아니면 공급 업체(Supplier)입니까?";
    });

    // 3. 다음 단계 안내 (세션 재개용)
    this.on('getNextStep', async (req) => {
        const currentUserId = req.user.id;
        const session = await SELECT.one.from(RegistrationSessions).where({ 
            userId: currentUserId,
            status: { '!=': 'COMPLETED' }
        }).orderBy('createdAt desc');

        if (!session) return "진행 중인 내역이 없습니다. 새로 시작해 주세요.";

        switch (session.status) {
            case 'INIT':
                return "이전 대화에서 '등록 주체 확인' 단계까지 진행되었습니다. Buyer입니까, Supplier입니까?";
            case 'SUBJECT_CONFIRMED':
                return `등록 주체가 ${session.roleType}로 확인되었습니다. 다음으로 대상 업체가 국내 업체인지 해외 업체인지 알려주세요.`;
            case 'COUNTRY_CONFIRMED':
                return `업체 정보 수집이 완료되었습니다. 최종 등록을 진행할까요?`;
            default:
                return "상태를 확인할 수 없습니다. 초기화 후 다시 시작하는 것을 추천합니다.";
        }
    });

    // 4. 데이터 업데이트
    this.on('updateState', async (req) => {
        const currentUserId = req.user.id;
        const { status, roleType, isDomestic, taxId, companyName } = req.data;
        
        const session = await SELECT.one.from(RegistrationSessions).where({ 
            userId: currentUserId, 
            status: { '!=': 'COMPLETED' } 
        });
        if (!session) return "진행 중인 세션이 없습니다.";

        let updateData = {};
        if (status) updateData.status = status;
        if (roleType !== undefined) updateData.roleType = roleType;
        if (isDomestic !== undefined) updateData.isDomestic = isDomestic;
        if (taxId !== undefined) updateData.taxId = taxId;
        if (companyName !== undefined) updateData.companyName = companyName;

        await UPDATE(RegistrationSessions).set(updateData).where({ ID: session.ID });
        return "데이터가 성공적으로 업데이트되었습니다.";
    });

    // 5. 최종 실행
    this.on('executeFinalRegistration', async (req) => {
        const currentUserId = req.user.id;
        const session = await SELECT.one.from(RegistrationSessions).where({ 
            userId: currentUserId,
            status: { '!=': 'COMPLETED' }
        }).orderBy('createdAt desc');

        if (!session || session.status !== 'COUNTRY_CONFIRMED') return "최종 등록 가능 상태가 아닙니다.";

        let result = session.roleType === 'Buyer' 
            ? "Buyer 경로: RPA/SBPA 자동화 봇이 데이터를 입력합니다." 
            : "Supplier 경로: Ariba 자가 등록 초대 메일을 발송했습니다.";

        await UPDATE(RegistrationSessions).set({ status: 'COMPLETED' }).where({ ID: session.ID });
        return result;
    });
});