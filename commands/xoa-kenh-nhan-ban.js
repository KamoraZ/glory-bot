const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xoa-kenh-nhan-ban')
        .setDescription('Tự động quét và xóa các kênh trùng tên (nhân bản) trên server, giữ lại kênh tạo đầu tiên'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const channels = await interaction.guild.channels.fetch();
            const nameMap = new Map();

            // Nhóm các kênh theo tên (bỏ qua category nếu muốn, hoặc xét toàn bộ / theo loại)
            channels.forEach(channel => {
                if (!channel) return;
                // Có thể phân biệt theo type hoặc chỉ tên
                const key = `${channel.type}_${channel.name.toLowerCase()}`;
                if (!nameMap.has(key)) {
                    nameMap.set(key, []);
                }
                nameMap.get(key).push(channel);
            });

            let deletedCount = 0;
            let deletedNames = [];

            for (const [key, chList] of nameMap.entries()) {
                if (chList.length > 1) {
                    // Sắp xếp theo thời gian tạo (cũ nhất giữ lại)
                    chList.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                    
                    // Giữ lại phần tử đầu tiên (cũ nhất), xóa các phần tử sau (nhân bản)
                    for (let i = 1; i < chList.length; i++) {
                        const duplicateChannel = chList[i];
                        try {
                            const name = duplicateChannel.name;
                            await duplicateChannel.delete('Xóa kênh nhân bản / trùng lặp tự động');
                            deletedCount++;
                            deletedNames.push(name);
                        } catch (err) {
                            console.error(`Không thể xóa kênh ${duplicateChannel.name}:`, err);
                        }
                    }
                }
            }

            if (deletedCount > 0) {
                await interaction.editReply({ 
                    content: `✅ Đã quét và xóa thành công **${deletedCount}** kênh nhân bản/trùng lặp!\nCác kênh đã xóa: ${deletedNames.slice(0, 10).join(', ')}${deletedNames.length > 10 ? ' và còn nữa...' : ''}` 
                });
            } else {
                await interaction.editReply({ content: '✨ Không tìm thấy kênh nhân bản hoặc trùng lặp nào trên server!' });
            }
        } catch (error) {
            console.error('Lỗi khi xóa kênh nhân bản:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi quét hoặc xóa kênh nhân bản. Vui lòng kiểm tra quyền của bot!' });
        }
    },
};
